export const isValidemail=(email)=>{
  const emailregex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ ;
  if(emailregex.test(email)){
    return true ;
  }else{
    console.log("enter a valid email ");
    return false ;
  }
}
export const isValidpassword = (password) => {
  return password.length >= 6;
};

export const inputsanitize =(input) =>{
  if (typeof input !== "string") return input 
  return input.trim();
}
