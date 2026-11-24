import {api} from './api-core.mjs';

export async function requestJson(request){
 const responseHeaders=new Headers({
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'private, no-store'
 });
 const headers=Object.fromEntries(request.headers);
 const url=new URL(request.url);
 headers.host ||= url.host;
 const req={
  method:request.method,
  headers,
  socket:{remoteAddress:process.env.VERCEL?(headers['x-vercel-forwarded-for']||'unknown'):'local'},
  async *[Symbol.asyncIterator](){
   if(!request.body)return;
   const reader=request.body.getReader();
   try{
    for(;;){
     const {value,done}=await reader.read();
     if(done)break;
     yield value;
    }
   }finally{reader.releaseLock();}
  }
 };
 const res={setHeader:(key,value)=>responseHeaders.set(key,value)};
 try{
  const body=await api(req,res,url.pathname);
  return new Response(JSON.stringify(body),{headers:responseHeaders});
 }catch(error){
  const status=Number.isInteger(error.code)?error.code:500;
  if(status===500)console.error(error);
  return new Response(JSON.stringify({error:status===500?'Something went wrong. Please try again.':error.message}),{status,headers:responseHeaders});
 }
}
