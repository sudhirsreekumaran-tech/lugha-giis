import {randomBytes} from 'node:crypto';
import {connect,run} from '../database.mjs';

const email=process.env.LUGHA_ADMIN_EMAIL?.trim().toLowerCase();
if(!email||!process.env.SUPABASE_DATABASE_URL||process.env.VERCEL)throw Error('Set LUGHA_ADMIN_EMAIL and a Supabase database URL in a local secret environment.');
const {pool}=await connect();
try{
 const result=await pool.query('SELECT id,email FROM auth.users WHERE lower(email)=$1 AND email_confirmed_at IS NOT NULL',[email]);
 if(result.rows.length!==1)throw Error('Create and confirm the administrator in Supabase Auth first.');
 const identity=result.rows[0];
 const init={name:'School administrator',level:'Beginner',goal:'Classroom learning',mode:'Normal',minutes:10,theme:'Light',avatar:'🌟',english:100,arabic:100,spacing:1.55,speed:.85,onboarded:true,equipped:-1};
 const saved=await run('INSERT OR IGNORE INTO users(id,email,role,profile,auth_id) VALUES(?,?,?,?,?)',randomBytes(24).toString('hex'),identity.email,'admin',JSON.stringify(init),identity.id);
 if(!saved.changes)throw Error('This account already has a profile. No role was changed.');
 console.log('The confirmed school administrator is linked.');
}finally{await pool.end();}
