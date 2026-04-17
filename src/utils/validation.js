export const isValidemail=(email)=>{
  const emailregex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ ;
  if(emailregex.test(email)){
    return true ;
  }else{
    console.log("enter a valid email ");
    return false ;
  }
}

export const isValidpassword =(password)=>{
  if (password.length < 6){
    return {valid:false , message:"should contain more than 6 character"} ;
    
  }else{
    return {valid:true} ;
  }}

export const inputsanitize =(input) =>{
  if (typeof input !== "string") return input 
  return input.trim();
}
