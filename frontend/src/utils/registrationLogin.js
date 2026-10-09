// Transfer credentials between mounted pages in memory, never browser storage or URLs.
let pending=null;
export function prepareRegistrationLogin(code,password,username){
  pending={code,username,password,expiresAt:Date.now()+60000};
}
export function registrationLogin(code){
  if(!pending || pending.expiresAt<Date.now()){pending=null;return null;}
  return pending.code===code?pending:null;
}
export function clearRegistrationLogin(){pending=null;}
