import { randomBytes } from 'node:crypto';
import { one, run, transact, connect } from '../database.mjs';
import { initialize } from '../api-core.mjs';
import { supabaseAuth } from '../supabase-auth.mjs';

const spec=[
 ['student','student','Amina (fictional)'],
 ['parent','parent','Demo parent'],
 ['teacher','teacher','Demo teacher'],
 ['admin','admin','Demo administrator'],
 ['student2','student','Kareem (fictional)']
];

async function demo(){
 const project=process.env.SUPABASE_DEMO_PROJECT_REF;
 const url=new URL(process.env.SUPABASE_URL);
 const dbUrl=new URL(process.env.SUPABASE_DATABASE_URL);
 const poolUser=decodeURIComponent(dbUrl.username);
 if(dbUrl.hostname!=='db.'+project+'.supabase.co'&&!poolUser.endsWith('.'+project))throw Error('Use a database URL from the same dedicated demo project.');
 if(process.env.LUGHA_DEMO_PROVISION!=='1'||!project||url.hostname!==project+'.supabase.co'||!process.env.SUPABASE_DATABASE_URL||process.env.VERCEL){
  throw Error('Set the dedicated demo project reference and explicitly enable local provisioning.');
 }
 const {pool}=await connect();
 const linked=await pool.query("SELECT 1 FROM auth.users WHERE false");
 if(linked.rowCount!==0)throw Error('Could not verify the Auth schema.');
 const secrets=new Map(spec.map(([name])=>[name,process.env['LUGHA_DEMO_PASSWORD_'+name.toUpperCase()]]));
 if([...secrets.values()].some(value=>!value||value.length<8))throw Error('Set all five demo passwords in the local secret environment.');
 await initialize();
 const ids={};
 for(const [name,role,display] of spec){
  const email=name+'@lugha.example';
  const old=await pool.query("SELECT id,raw_app_meta_data FROM auth.users WHERE lower(email)=$1",[email]);
  let authId=old.rows[0]?.id;
  if(authId&&!old.rows[0].raw_app_meta_data?.lugha_demo)throw Error('An existing account is not marked as a LUGHA demo.');
  if(!authId){
   const created=await supabaseAuth('admin/users',{admin:true,data:{email,password:secrets.get(name),email_confirm:true,app_metadata:{lugha_demo:true}}});
   if(!created.ok||!created.data.id)throw Error('Supabase could not create the '+role+' demo account.');
   authId=created.data.id;
   const sameProject=await pool.query('SELECT id FROM auth.users WHERE id=$1',[authId]);
   if(!sameProject.rowCount)throw Error('The Auth project and PostgreSQL project do not match.');
  }
  const existing=await one('SELECT id,auth_id,demo FROM users WHERE email=?',email);
  if(existing&&(!existing.demo||existing.auth_id!==authId))throw Error('A non-matching local profile already exists.');
  const uid=existing?.id||randomBytes(24).toString('hex');
  ids[name]=uid;
  await run('INSERT OR IGNORE INTO users(id,email,role,profile,auth_id,demo) VALUES(?,?,?,?,?,?)',uid,email,role,JSON.stringify({name:display,level:'Beginner',goal:'Everyday Arabic',mode:'Normal',minutes:10,theme:'Light',avatar:'🦊',english:100,arabic:100,spacing:1.55,speed:.85,onboarded:true,equipped:-1}),authId,true);
 }
 await transact(async()=>{
  await run('INSERT OR IGNORE INTO school_students VALUES(?,?,?,?,?)',ids.student,'fiction-A','Grade 5','Beginner','{}');
  await run('INSERT OR IGNORE INTO school_students VALUES(?,?,?,?,?)',ids.student2,'fiction-B','Grade 7','Intermediate',JSON.stringify({largeText:true,shortSteps:true,reducedMotion:true,untimed:true}));
  await run('INSERT OR IGNORE INTO parent_links VALUES(?,?)',ids.parent,ids.student);
  await run('INSERT OR IGNORE INTO classrooms VALUES(?,?,?,0)','DEMOCLASS',ids.teacher,'Fictional Arabic class');
  for(const uid of [ids.student,ids.student2])await run('INSERT OR IGNORE INTO members VALUES(?,?)','DEMOCLASS',uid);
 });
 console.log('Five fictional Supabase accounts and class links are ready for the protected preview.');
 await pool.end();
}
demo().catch(error=>{console.error(error.code?'Provisioning failed ('+error.code+'). Check project configuration.':error.message);process.exit(1);});
