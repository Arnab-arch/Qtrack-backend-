import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config() ;   // .config()reads all the files .env and loads all the varialblew  in process.env


export const Authmiddleware = async(req,res,next) => {
    try{
        const authheader = req.headers.authorization;

        if(!authheader || !authheader.startsWith("Bearer ")){
           return res.status(401).json({
        success: false,
        message: "Access token required",
      }); 
        }

        const token = authheader.split(" ")[1];

        const decode = jwt.verify(token,process.env.JWT_SECRET);
        req.user = decode ;
        next();

    }catch(err){
         if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: err.message,
    });
    }
};

// we call Authroles like Authroles("staff,"admin) so (...allowedroles) puts them in a list and it just checks 
// if it exists in the required roles list
export const Authroles = (...allowedRoles)=>{
 return (req,res,next)=>{
    if(!req.user){
        return res.status(401).json({
             success: false,
        message: "Authentication required. Please login first.",

        });
    }
    if (!allowedRoles.includes(req.user.role)){
        return res.status(401).json({
            success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,

        });
    }
    next();


 }
    
}

export const autherizeOwner =(paramName = "userId")=>{
    return(req,res,next)=>{
        if(!req.user){
        return res.status(401).json({
             success: false,
        message: "Authentication required. Please login first.",

        });
    }
    const resourceUserId = req.params[paramName] || req.body[paramName] ;
    if(!resourceUserId){
        return res.status(400).json({
             success: false,
        message: `Missing ${paramName} parameter`,
        });
    }

    // resourceUserId = whose data is being requested 
    //req.user.user_id = who is making the request from jwt 
    if (parseInt(resourceUserId)!== parseInt(req.user.user_id)){
        return res.status(403).josn({
             success: false,
        message: "You can only access your own resources",
        });
    }
    next();
    }
}
export const authorizeRoleOrOwner = (...args) => {
  const paramName = args[args.length - 1];
  const privilegedRoles = args.slice(0, -1);
 
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
 
    if (privilegedRoles.includes(req.user.role)) {
      return next();
    }
 
    const resourceUserId = req.params[paramName] || req.body[paramName];
 
    if (resourceUserId && parseInt(resourceUserId) === parseInt(req.user.user_id)) {
      return next();
    }
 
    return res.status(403).json({
      success: false,
      message: "Access denied. Insufficient permissions.",
    });
  };
};