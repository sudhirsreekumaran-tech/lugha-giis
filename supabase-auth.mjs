function authUrl(path){
 const base=new URL(process.env.SUPABASE_URL);
 if(base.protocol!=='https:'||base.username||base.password)throw Error('Set a secure Supabase project URL.');
 return new URL('/auth/v1/'+path,base);
}
export async function supabaseAuth(path,{method='POST',data,token,admin=false}={}){
 const key=admin?process.env.SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!key||!process.env.SUPABASE_URL)throw Object.assign(Error('Supabase Auth is not configured.'),{code:503});
 const headers={apikey:key,'Content-Type':'application/json'};
 if(token||admin&&key.startsWith('ey'))headers.Authorization='Bearer '+(token||key);
 const response=await fetch(authUrl(path),{method,headers,body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(12000),cache:'no-store'});
 return {ok:response.ok,status:response.status,data:await response.json().catch(()=>({}))};
}
export function demoAllowed(host){
 return process.env.LUGHA_DEMO_AUTH_ENABLED==='1'&&host===process.env.LUGHA_DEMO_HOST&&(!process.env.VERCEL||process.env.VERCEL_ENV==='preview');
}
