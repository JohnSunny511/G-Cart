import User from "../models/User.js"


//Update User Cart Data  : /api/cart/update

export const updateCart = async (req,res) => {
    try {
        const {userId,cartItems} = req.body
        await User.findByIdAndUpdate(req.userId,{cartItems})
        res.json({success:true,message:"Cart Updated"})
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message})       
    }
}