import api from '../api';

// Memory only, scoped to the signed-in session. Cached rows render immediately
// when returning to the page; every load still checks the server for changes.
let session;
function currentSession() {
  const token=localStorage.getItem('garage_token');
  if(!session || session.token!==token) session={token,snapshot:null,pending:null};
  return session;
}
export function getCashbookSnapshot() {return currentSession().snapshot;}
export function loadCashbook() {
  const current=currentSession();
  if(current.pending) return current.pending;
  current.pending=api.get('/finance/cashbook').then(response=>{
    const snapshot={rows:response.data.data,accounts:response.data.accounts || []};
    if(current===currentSession()) current.snapshot=snapshot;
    return snapshot;
  }).finally(()=>{current.pending=null;});
  return current.pending;
}
