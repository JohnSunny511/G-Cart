import jwt from 'jsonwebtoken';

const authUser = async (req,res,next) => {
    const {token} = req.cookies;

    if(!token){
        return res.json({success:false,message:'Not Authorized'});
    }

    try{
        const tokenDecode = jwt.verify(token,process.env.JWT_SECRET)
        if(tokenDecode.id){
            req.userId = tokenDecode.id;
            console.log("🔑 Checking auth for userId:", req.userId);

        }else{
            return res.json({success:false,message:'Not authorized'});
        }
        next();
    }
    catch(error){
        res.json({success:false,message:error.message});
    }
}

export default authUser;