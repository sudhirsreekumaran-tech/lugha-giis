import {AsyncLocalStorage} from 'node:async_hooks';
import {DatabaseSync} from 'node:sqlite';

const inTransaction = new AsyncLocalStorage();
let connection;
let localQueue = Promise.resolve();

export async function connect(){
 if(connection)return connection;
 const url=process.env.TURSO_DATABASE_URL;
 if(url){
  if(!process.env.TURSO_AUTH_TOKEN)throw Error('TURSO_AUTH_TOKEN is required.');
  const {createClient}=await import('@libsql/client/web');
  connection ??= {remote:createClient({url,authToken:process.env.TURSO_AUTH_TOKEN})};
 }else{
  if(process.env.VERCEL)throw Error('A persistent database is required for Vercel.');
  if(!connection){
   const local=new DatabaseSync(process.env.LUGHA_DB||'lugha.sqlite');
   local.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
   connection={local};
  }
 }
 return connection;
}
async function statement(sql,args,write){
 const {remote,local}=await connect();
 if(remote)return (inTransaction.getStore()||remote).execute({sql,args});
 const execute=()=>{
  const stmt=local.prepare(sql);
  return write?{rowsAffected:stmt.run(...args).changes}:{rows:stmt.all(...args)};
 };
 if(inTransaction.getStore())return execute();
 await localQueue;
 return execute();
}
export const query=async(sql,...args)=>(await statement(sql,args,false)).rows;
export const one=async(sql,...args)=>(await query(sql,...args))[0];
export const run=async(sql,...args)=>({changes:(await statement(sql,args,true)).rowsAffected});

export async function batch(statements){
 const {remote,local}=await connect();
 if(remote)return remote.batch(statements,'write');
 return transact(async()=>{
  for(const entry of statements){
   if(typeof entry==='string')local.exec(entry);
   else await run(entry.sql,...entry.args);
  }
 });
}
export async function transact(fn){
 const {remote,local}=await connect();
 if(remote){
  const tx=await remote.transaction('write');
  try{
   const result=await inTransaction.run(tx,fn);
   await tx.commit();
   return result;
  }finally{tx.close();}
 }
 const previous=localQueue;
 let unlock;
 localQueue=new Promise(resolve=>{unlock=resolve;});
 await previous;
 try{
  local.exec('BEGIN IMMEDIATE');
  try{
   const result=await inTransaction.run(true,fn);
   local.exec('COMMIT');
   return result;
  }catch(error){local.exec('ROLLBACK');throw error;}
 }finally{unlock();}
}
