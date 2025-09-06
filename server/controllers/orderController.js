import { response } from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripe from 'stripe'
import User from '../models/User.js'

//Place Order COD : /api/order/cod

export const placeOrderCOD = async (req, res) => {
  try {
    const { items, address } = req.body;

    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "Invalid Data" });
    }

    // Calculate amount
    let amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      return (await acc) + product.offerPrice * item.quantity;
    }, 0);

    amount += Math.floor(amount * 0.02); // tax

    await Order.create({
      userId: req.userId,  // ✅ attach userId from JWT
      items,
      amount,
      address,
      paymentType: "COD",
    });

    return res.json({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};



//Place Order Stripe : /api/order/stripe
export const placeOrderStripe = async (req,res) => {
  try {
    const { items, address } = req.body;
    const { origin } = req.headers;

    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "Invalid Data" });
    }

    let productData = [];
    let amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      productData.push({
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });
      return (await acc) + product.offerPrice * item.quantity;
    }, 0);

    amount += Math.floor(amount * 0.02);

    const order = await Order.create({
      userId: req.userId,   // ✅ attach userId
      items,
      amount,
      address,
      paymentType: "Online",
    });

    // Stripe stuff unchanged...


        //Stripe Gateway Initialize
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)

        //Create line items for Stripe
        const line_items = productData.map((item) =>{
            return{
                price_data:{
                    currency: "usd",
                    product_data:{
                        name:item.name,
                    },
                    unit_amount:Math.floor(item.price + item.price * 0.02) * 100
                },
                quantity: item.quantity,
            }
        })

        //create Session
        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: "payment",
            success_url: `${origin}/loader?next=my-orders`,
            cancel_url: `${origin}/cart`,
            metadata:{
                orderId: order._id.toString(),
                userId: req.userId 
            }
        })

        return res.json({success:true,url:session.url})

    } catch (error) {
        return res.json({success:false,message:error.message})
    }
}

//Stripe Webhook to verify payment Action :/stripe
//Stripe Webhook to verify payment Action :/stripe
export const stripeWebHooks = async (request, response) => {
    //Stripe Gateway Initialize
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const sig = request.headers["stripe-signature"];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log("✅ Webhook verified successfully:", event.type);
    } catch (error) {
        console.error("❌ Webhook signature verification failed:", error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    //Handle the event
    switch (event.type) {
        // ==> NEW: ADDED THIS CASE FOR THE BEST PRACTICE <==
        case "checkout.session.completed": {
            console.log("✅ Checkout Session completed event received");
            
            // The session object is directly available in the event data
            const session = event.data.object;

            const { orderId, userId } = session.metadata;
            console.log("✅ Metadata extracted:", { orderId, userId });

            if (!orderId || !userId) {
                console.error("❌ Metadata missing in checkout.session.completed event.");
                break; // Exit if we don't have the data we need
            }

            try {
                // Mark Payment as Paid
                await Order.findByIdAndUpdate(orderId, { isPaid: true });
                console.log("✅ Order updated:", orderId);

                // Clear User Cart
                await User.findByIdAndUpdate(userId, { cartItems: {} });
                console.log("✅ User cart cleared:", userId);

            } catch (err) {
                console.error("❌ Error while handling checkout.session.completed:", err.message);
            }
            break;
        }

        // NOTE: You can now optionally remove the "payment_intent_succeeded" case
        // as "checkout.session.completed" handles it more efficiently.
        case "payment_intent_succeeded": {
            console.log("✅ Payment Intent succeeded event received (handled as fallback)");
            // ... your old logic can remain here as a backup if you want ...
            break;
        }

        case "payment_intent.payment_failed": { // Corrected event name from payment_intent_failed
            console.log("❌ Payment Intent failed event received");
            // ... your logic for failed payments ...
            break;
        }

        default:
            console.log(`ℹ️ Unhandled event type: ${event.type}`);
            break;
    }

    response.json({ received: true });
};


//Get Orders by UserId : /api/order/user

export const getUserOrders = async (req,res) => {
    try {
        const userId = req.userId;
        const orders = await Order.find({
            userId,
            $or: [{paymentType: "COD"}, {isPaid:true}]
        }).populate("items.product").sort({createdAt:-1});
        res.json({success:true,orders});
    } catch (error) {
        return res.json({success:false,message:error.message})
    }
}


//Get all orders (for seller/admin) : /api/order/seller

export const getAllOrders = async (req,res) => {
    try {
        const orders = await Order.find({
            $or: [{paymentType: "COD"}, {isPaid:true}]
        }).populate("items.product.address").sort({createdAt: -1});
        res.json({success:true,orders});
    } catch (error) {
        return res.json({success:false,message:error.message})
    }
}