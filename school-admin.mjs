import { randomBytes } from 'node:crypto';
import { query,one,run,transact } from './database.mjs';
import { supabaseAuth } from './supabase-auth.mjs';

const key=()=>randomBytes(12).toString('hex');
const clean=(value,max=120)=>typeof value==='string'?value.trim().slice(0,max):'';
const allowed=['student','parent','teacher'];
const helpKeys=['largeText','reducedMotion','audioInstructions','shortSteps','untimed'];
const audit=(actor,action,target)=>run('INSERT INTO audit_log(actor,action,target) VALUES(?,?,?)',actor,action,target);
const profile=(name,defaults)=>JSON.stringify({...defaults,name,onboarded:true});

export async function adminOverview(user){
 const accounts=await query('SELECT id,email,role,disabled_at,demo FROM users WHERE email IS NOT NULL AND demo=? ORDER BY email LIMIT 500',!!user.demo);
 const classes=await query('SELECT c.id,c.name,c.teacher FROM classrooms c JOIN users u ON u.id=c.teacher WHERE u.demo=? ORDER BY c.name',!!user.demo);
 const stats=await one("SELECT COUNT(*) AS activities,COUNT(CASE WHEN kind='lesson' THEN 1 END) AS lessons,COUNT(CASE WHEN kind='arcade' THEN 1 END) AS arcade FROM activity a JOIN users u ON u.id=a.uid WHERE u.demo=?",!!user.demo);
 const events=await query('SELECT l.action,l.target,l.created_at FROM audit_log l JOIN users u ON u.id=l.actor WHERE u.demo=? ORDER BY l.id DESC LIMIT 20',!!user.demo);
 return {accounts,classes,stats,events};
}
export async function manageSchool(user,body,defaults,fail){
 const target=clean(body.uid,64);
 const action=clean(body.action,30);
 if(action==='create-account'){
  if(user.demo)fail(403,'Demo administrators cannot create Auth accounts.');
  const email=clean(body.email,254).toLowerCase(),role=body.role,name=clean(body.name,32);
  if(email.endsWith('@lugha.example'))fail(400,'Use the dedicated provisioning script for fictional accounts.');
  if(!name||!allowed.includes(role)||!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email)||typeof body.password!=='string'||body.password.length<12||body.password.length>128)fail(400,'Enter a name, email, role and a temporary password of at least 12 characters.');
  if(await one('SELECT 1 FROM users WHERE email=?',email))fail(409,'An account already uses this email.');
  const remote=await supabaseAuth('admin/users',{admin:true,data:{email,password:body.password,email_confirm:true}});
  const authId=remote.data.id;
  if(!remote.ok||!authId)fail(400,'Supabase could not create that account.');
  const uid=key();
  try{
   await transact(async()=>{
    await run('INSERT INTO users(id,email,role,profile,auth_id) VALUES(?,?,?,?,?)',uid,email,role,profile(name,defaults),authId);
    await audit(user.id,action,uid);
   });
  }catch(error){
   await supabaseAuth('admin/users/'+encodeURIComponent(authId),{method:'DELETE',admin:true}).catch(()=>{});
   throw error;
  }
  return {saved:true};
 }
 return transact(async()=>{
  const account=target?await one('SELECT id,role,demo FROM users WHERE id=?',target):null;
  if(account&&Boolean(account.demo)!==Boolean(user.demo))fail(403,'Demo and school accounts are isolated.');
  const room=clean(body.room,30);
  if(action==='disable-account'||action==='activate-account'||action==='change-role'){
   if(!account||account.role==='admin'||target===user.id)fail(403,'This administrator account is protected.');
   if(action==='change-role'){
    if(!allowed.includes(body.role))fail(400,'Choose Student, Parent or Teacher.');
    const linked=await one(`SELECT 1 FROM (
     SELECT uid FROM school_students WHERE uid=? UNION ALL SELECT parent AS uid FROM parent_links WHERE parent=?
     UNION ALL SELECT teacher AS uid FROM classrooms WHERE teacher=? UNION ALL SELECT uid FROM members WHERE uid=?
    ) linked LIMIT 1`,target,target,target,target);
    if(linked&&account.role!==body.role)fail(409,'Remove school relationships before changing this role.');
    await run('UPDATE users SET role=? WHERE id=?',body.role,target);
   }else await run('UPDATE users SET disabled_at=? WHERE id=?',action==='disable-account'?new Date().toISOString():null,target);
   await run('DELETE FROM sessions WHERE uid=?',target);
  }else if(action==='save-student'){
   if(account?.role!=='student')fail(400,'Choose a student account.');
   const support=Object.fromEntries(helpKeys.map(key=>[key,body.support?.[key]===true]));
   const level=['Complete Beginner','Beginner','Intermediate','Advanced'].includes(body.level)?body.level:null;
   await run('INSERT INTO school_students(uid,external_id,grade,learner_level,support) VALUES(?,NULL,?,?,?) ON CONFLICT(uid) DO UPDATE SET grade=excluded.grade,learner_level=excluded.learner_level,support=excluded.support',target,clean(body.grade,30),level,JSON.stringify(support));
  }else if(action==='create-class'||action==='assign-teacher'){
   if(account?.role!=='teacher')fail(400,'Choose a teacher account.');
   if(action==='create-class'){
    const name=clean(body.name,60);
    if(!name)fail(400,'Enter a classroom name.');
    await run('INSERT INTO classrooms VALUES(?,?,?,0)',key().slice(0,10).toUpperCase(),target,name);
   }else if(!(await run('UPDATE classrooms SET teacher=? WHERE id=? AND teacher IN (SELECT id FROM users WHERE demo=?)',target,room,!!user.demo)).changes)fail(404,'Classroom unavailable.');
  }else if(action==='enrol-student'){
   const classroom=await one('SELECT c.id FROM classrooms c JOIN users u ON u.id=c.teacher WHERE c.id=? AND u.demo=?',room,!!user.demo);
   if(!classroom||account?.role!=='student')fail(400,'Choose a classroom and student.');
   await run('INSERT OR IGNORE INTO members VALUES(?,?)',room,target);
  }else if(action==='link-parent'){
   const parent=clean(body.parent,64);
   const linked=await one("SELECT id FROM users WHERE id=? AND role='parent' AND demo=?",parent,!!user.demo);
   if(!linked||account?.role!=='student')fail(400,'Choose a parent and student.');
   await run("INSERT OR IGNORE INTO school_students VALUES(?,NULL,NULL,NULL,'{}')",target);
   await run('INSERT OR IGNORE INTO parent_links VALUES(?,?)',parent,target);
  }else fail(400,'Choose a valid management action.');
  await audit(user.id,action,room||target);
  return {saved:true};
 });
}
