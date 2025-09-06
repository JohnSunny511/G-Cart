    import mongoose from "mongoose";

    const productSchema = new mongoose.Schema({
            name: {type: String,required:true},
            description: {type: Array,required:true}, 
            price: {type: Number,default: {}}, 
            offerPrice: {type: Number,default: {}}, 
            image: {type: Array,default: {}}, 
            category: {type: String,default: {}}, 
            inStock: {type: Boolean,default: true}, 
        
        }, {timestamps:true})
        
    const Product = mongoose.models.product || mongoose.model('product',productSchema)

    export default Product;