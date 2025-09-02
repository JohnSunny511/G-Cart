import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {type: String,required:true},
        email: {type: Array,required:true},
        description: {type: Number,required:true}, 
        price: {type: Object,default: {}}, 
        offPrice: {type: Object,default: {}}, 
        image: {type: Array,default: {}}, 
        inStock: {type: Boolean,default: true}, 
    
    }, {timestamps:true})
    
const Product = mongoose.models.product || mongoose.model('product',productSchema)

export default Product;