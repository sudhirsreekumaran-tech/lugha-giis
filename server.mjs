import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {api,initialize,setRole,fail} from './api-core.mjs';
if(process.argv[2]==='role'){
 await setRole(process.argv[3],process.argv[4]);
 console.log('Role updated.');
 process.exit();
}
await initialize();
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.mjs':'app.mjs','/ui-preview.mjs':'ui-preview.mjs','/content.mjs':'content.mjs','/curriculum.mjs':'curriculum.mjs','/noor.webp':'noor.webp','/noor.png':'noor.png','/giis-logo.png':'giis-logo.png','/arcade-engine.mjs':'arcade-engine.mjs','/arcade-ui.mjs':'arcade-ui.mjs'};
const types={html:'text/html',css:'text/css',mjs:'text/javascript',webp:'image/webp',png:'image/png'};
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','same-origin');
 res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 res.setHeader('Permissions-Policy','microphone=(self)');
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/api/')){
   res.setHeader('Content-Type','application/json; charset=utf-8');
   res.setHeader('Cache-Control','no-store');
   res.end(JSON.stringify(await api(req,res,path)));
   return;
  }
  const file=files[path];
  if(!file||req.method!=='GET')fail(404,'Page unavailable.');
  const data=readFileSync(new URL('./public/'+file,import.meta.url));
  res.setHeader('Content-Type',types[file.split('.').at(-1)]+'; charset=utf-8');
  res.end(data);
 }catch(error){
  const code=Number.isInteger(error.code)?error.code:error.code==='ENOENT'?404:500;
  if(code===500)console.error(error);
  res.statusCode=code;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify({error:code===500?'Something went wrong. Please try again.':code===404?'Page unavailable.':error.message}));
 }
});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('LUGHA is running on port '+server.address().port));
