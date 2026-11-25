import pg from 'pg';

const types={
 getTypeParser(oid,format){
  if(oid===20&&(!format||format==='text'))return value=>{
   const result=Number(value);
   if(!Number.isSafeInteger(result))throw Error('Database integer is outside the supported range.');
   return result;
  };
  return pg.types.getTypeParser(oid,format);
 }
};
export const postgresEnabled=()=>Boolean(process.env.SUPABASE_DATABASE_URL);
export function createPostgres(){
 const url=new URL(process.env.SUPABASE_DATABASE_URL);
 url.searchParams.delete('sslmode');
 return new pg.Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:true},max:3,types,connectionTimeoutMillis:6000,idleTimeoutMillis:10000});
}
export function postgresSql(sql){
 let index=0;
 const conflict=/^INSERT OR IGNORE INTO /i.test(sql);
 const statement=sql
  .replace(/^INSERT OR IGNORE INTO /i,'INSERT INTO ')
  .replace(/INSERT INTO content VALUES/i,'INSERT INTO content(id,data) VALUES')
  .replace(/ORDER BY rowid/i,'ORDER BY position')
  .replace("json_extract(u.profile,'$.leaderboard')=1","u.profile::jsonb->>'leaderboard'='true'")
  .replace(/\?/g,()=>'$'+(++index));
 return conflict?statement+' ON CONFLICT DO NOTHING':statement;
}
export async function postgresTransaction(pool,fn,write=true){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SET LOCAL search_path TO lugha, pg_catalog');
  if(write)await client.query('SELECT pg_advisory_xact_lock(60125001)');
  const result=await fn(client);
  await client.query('COMMIT');
  return result;
 }catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  throw error;
 }finally{client.release();}
}
