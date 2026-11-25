import {adminOverview,manageSchool} from './school-admin.mjs';
import {postgresEnabled} from './postgres.mjs';
import {supabaseAuth,demoAllowed} from './supabase-auth.mjs';
import { tutorTopics } from './public/tutor-topics.mjs';
import { effectiveProfile, linkedChildren, classLearning, schoolSchema, seedSchoolDemo } from './school.mjs';
import { cabinets } from './public/arcade-engine.mjs';
import { arcadeSchema, arcadeService } from './arcade-service.mjs';
import { query, one, run, batch, transact } from './database.mjs';

import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

import { lessons as starter, worlds, games, scenes, cosmetics } from './public/content.mjs';

const schema = `
 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,role TEXT NOT NULL,profile TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,target TEXT NOT NULL,questions TEXT NOT NULL,position INTEGER DEFAULT 0,misses INTEGER DEFAULT 0,finished INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS activity(uid TEXT NOT NULL REFERENCES users(id),key TEXT NOT NULL,kind TEXT NOT NULL,target TEXT NOT NULL,xp INTEGER NOT NULL,gems INTEGER NOT NULL,at TEXT NOT NULL,score INTEGER,PRIMARY KEY(uid,key));
 CREATE TABLE IF NOT EXISTS lesson_viewing(uid TEXT NOT NULL REFERENCES users(id),lesson TEXT NOT NULL REFERENCES content(id),slide INTEGER NOT NULL,visited TEXT NOT NULL,completed_at TEXT,PRIMARY KEY(uid,lesson));
 CREATE TABLE IF NOT EXISTS study(uid TEXT NOT NULL REFERENCES users(id),lesson TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(uid,lesson));
 CREATE TABLE IF NOT EXISTS mastery(uid TEXT NOT NULL REFERENCES users(id),word TEXT NOT NULL,hits INTEGER DEFAULT 0,misses INTEGER DEFAULT 0,due INTEGER NOT NULL,PRIMARY KEY(uid,word));
 CREATE TABLE IF NOT EXISTS inventory(uid TEXT NOT NULL REFERENCES users(id),item INTEGER NOT NULL,PRIMARY KEY(uid,item));
 CREATE TABLE IF NOT EXISTS classrooms(id TEXT PRIMARY KEY,teacher TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,visible INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS members(room TEXT REFERENCES classrooms(id),uid TEXT REFERENCES users(id),PRIMARY KEY(room,uid));
 CREATE TABLE IF NOT EXISTS assignments(id TEXT PRIMARY KEY,room TEXT REFERENCES classrooms(id),lesson TEXT NOT NULL,title TEXT NOT NULL);
`;
let ready;
export function initialize(){
 if (!ready) ready=seed().catch(error=>{ready=undefined;throw error;});
 return ready;
}
async function seed(){
 const statements=[...(postgresEnabled()?[]:(schema+arcadeSchema+schoolSchema).split(';').map(x=>x.trim()).filter(Boolean)), ...starter.map(lesson=>({sql:'INSERT OR IGNORE INTO content VALUES(?,?)',args:[lesson.id,JSON.stringify(lesson)]}))];
 await batch(statements);
 if(!postgresEnabled())await seedSchoolDemo(defaults,passwordHash);
}
const id = ()=>randomBytes(24).toString('hex');
const hash = value=>createHash('sha256').update(value).digest('hex');
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:process.env.LUGHA_TIME_ZONE||'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'});
const dayOf = (time)=>dayFormat.format(new Date(time));
const today = (offset=0)=>dayOf(Date.now()+offset*86400000);
const weekOf = time=>{
 const date=new Date(dayOf(time)+'T00:00:00Z');
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
 return date.toISOString().slice(0,10);
};
const defaults = {name:'Explorer',level:'Complete Beginner',goal:'Everyday Arabic',mode:'Normal',minutes:10,theme:'Light',avatar:'🦊',english:100,arabic:100,spacing:1.55,speed:.85,motion:false,audioInstructions:false,sound:false,onboarded:false,equipped:-1,leaderboard:false};
const ranks = [0,150,400,800,1400,2200,3200,4500];
const curriculum = async()=> (await query('SELECT data FROM content ORDER BY rowid')).map(row=>JSON.parse(row.data));
function passwordHash(password,salt=id()) {return salt+':'+scryptSync(password,salt,64).toString('hex');}
export async function setRole(email,role){
 await initialize();
 if(!email||!['student','parent','teacher','admin'].includes(role))throw Error('Usage: node server.mjs role EMAIL student|teacher|admin');
 if(!(await run('UPDATE users SET role=? WHERE email=?',role,email.toLowerCase())).changes)throw Error('Register this email first.');
}
export function fail(code,message){throw Object.assign(new Error(message),{code});}
function text(value,length=120){return typeof value==='string'?value.trim().slice(0,length):'';}
async function getUser(req){
 const token=/\blugha=([a-f0-9]{48})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
 return token && one('SELECT users.* FROM sessions JOIN users ON users.id=sessions.uid WHERE token=? AND expires>?',hash(token),Date.now());
}
async function session(res,uid,remember=true){
 const token=id();
 await run('INSERT INTO sessions VALUES(?,?,?)',hash(token),uid,Date.now()+(remember?30*86400000:12*3600000));
 res.setHeader('Set-Cookie','lugha='+token+'; Path=/; HttpOnly; SameSite=Lax'+(remember?'; Max-Age=2592000':'')+((process.env.LUGHA_HTTPS==='1'||process.env.VERCEL)?'; Secure':''));
}
async function limit(key,max,ms){
 const now=Date.now();
 const counted=await one(
  `INSERT INTO rate_limits(key,hits,expires) VALUES(?,1,?)
   ON CONFLICT(key) DO UPDATE SET
    hits=CASE WHEN expires<=? THEN 1 ELSE hits+1 END,
    expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END
   RETURNING hits`,
  hash(key),now+ms,now,now
 );
 if(counted.hits>max)fail(429,'Too many requests. Try again later.');
}
function settings(body,current){
 const profile={...current};
 for(const [key,values] of Object.entries({mode:['Normal','Special','Dyslexia'],level:['Complete Beginner','Beginner','Intermediate','Advanced'],theme:['Light','Dark','Cream','High contrast'],avatar:['🦊','🌟','🌙','🐪','🌵'],minutes:[5,10,15,20]})) if(values.includes(body[key]))profile[key]=body[key];
 for(const key of ['motion','sound','audioInstructions','simplified','readingFont','leaderboard','onboarded'])if(typeof body[key]==='boolean')profile[key]=body[key];
 for(const [key,min,max] of [['english',85,145],['arabic',85,175],['spacing',1.3,2.3],['speed',.5,1.25],['videoSpeed',.5,1.5]])if(typeof body[key]==='number')profile[key]=Math.min(max,Math.max(min,body[key]));
 if(text(body.name,32))profile.name=text(body.name,32);
 if(text(body.goal,80))profile.goal=text(body.goal,80);
 return profile;
}
async function award(uid,key,kind,target,xp,gems,score=null){
 return (await run('INSERT OR IGNORE INTO activity VALUES(?,?,?,?,?,?,?,?)',uid,key,kind,target,xp,gems,new Date().toISOString(),score)).changes>0;
}
async function state(user){
 const activity=await query('SELECT * FROM activity WHERE uid=? ORDER BY at DESC',user.id);
 const completed=activity.filter(x=>x.kind==='lesson').map(x=>x.target);
 const bosses=activity.filter(x=>x.kind==='boss').map(x=>Number(x.target));
 const past=new Set(activity.filter(x=>['lesson','boss','game','writing','video','revision','arcade'].includes(x.kind)).map(x=>dayOf(x.at)));
 let streak=0,longest=0,counter=0,previous;
 for(const day of [...past].sort()){counter=previous && Date.parse(day)-Date.parse(previous)===86400000?counter+1:1;longest=Math.max(counter,longest);previous=day;}
 for(let offset=past.has(today())?0:-1;past.has(today(offset));offset--)streak++;
 const mastery=await query('SELECT word,hits,misses,due FROM mastery WHERE uid=?',user.id);
 const xp=activity.reduce((sum,x)=>sum+x.xp,0);
 const gems=activity.reduce((sum,x)=>sum+x.gems,0);
 const level=ranks.findLastIndex(value=>xp>=value);
 const kindCount=kind=>activity.filter(x=>x.kind===kind).length;
 const arcadeBests=await arcade.bests(user.id);
 const achievements=[
  ['First Steps','Complete a lesson',completed.length>=1],
  ['Alphabet Champion','Clear Alphabet Oasis',bosses.includes(0)],
  ['Vocabulary Master','Master ten vocabulary items',mastery.filter(x=>x.hits>=3).length>=10],
  ['Grammar Genius','Clear Grammar Galaxy',bosses.includes(3)],
  ['Writing Wizard','Complete three writing activities',activity.filter(x=>x.kind==='writing').length>=3],
  ['Conversation Hero','Clear Conversation City',bosses.includes(4)],
  ['Seven-Day Explorer','Learn seven days in a row',longest>=7],
  ['Arabic Master','Clear every world',bosses.length===8],
  ...[[2,'Lesson Pair'],[5,'Oasis Learner'],[10,'Steady Learner'],[20,'Curious Explorer'],[35,'Trail Guide'],[50,'Curriculum Finisher']].map(([n,name])=>[name,'Complete '+n+' lessons',completed.length>=n]),
  ...[[1,'Garden Guide'],[2,'Village Visitor'],[5,'Royal Scribe'],[6,'Desert Guide']].map(([i,name])=>[name,'Clear '+worlds[i][0],bosses.includes(i)]),
  ...[[1,'Game Starter'],[5,'Game Explorer'],[10,'Game Specialist']].map(([n,name])=>[name,n===1?'Complete one mini-game':'Complete '+n+' distinct mini-games',new Set(activity.filter(x=>x.kind==='game').map(x=>x.target)).size>=n]),
  ['First Draft','Complete one writing exercise',kindCount('writing')>=1],
  ['Writing Habit','Complete ten writing exercises',kindCount('writing')>=10],
  ['First Screening','Pass your first video check',kindCount('video')>=1],
  ['Video Explorer','Pass five video checks',kindCount('video')>=5],
  ['Fresh Memory','Finish one revision mission',kindCount('revision')>=1],
  ['Review Routine','Finish five revision missions',kindCount('revision')>=5],
  ['Daily Quest Hero','Complete one daily quest',kindCount('quest')>=1],
  ['Perfect Checkpoint','Complete a boss challenge without errors',kindCount('quiz')>=1],
  ['Gem Collector','Earn 50 gems',activity.reduce((s,a)=>s+Math.max(0,a.gems),0)>=50],
  ['Innovation Champion','Complete a Block Builder mission',arcadeBests.some(x=>x.game==='blocks')],
  ['Cultural Explorer','Complete Cross the Emirates',arcadeBests.some(x=>x.game==='cross')],
  ['Perseverance Hero','Finish a revision mission on five different days',kindCount('revision')>=5]
 ];
 const week=weekOf(Date.now());
 const weeklyCount=activity.filter(x=>x.kind==='lesson'&&weekOf(x.at)===week).length;
 return {viewing:await query('SELECT lesson,slide,visited,completed_at FROM lesson_viewing WHERE uid=?',user.id),arcadeBests,weeklyCount,week,journeys:await query('SELECT lesson,score,accuracy,completed_at FROM learning_journeys WHERE uid=? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 30',user.id),profile:await effectiveProfile(user),role:user.role,demo:!!user.demo||user.id.startsWith('demo-'),guest:!user.email,activity,completed,bosses,days:[...past],streak,longest,mastery,xp,gems,level,next:ranks[level+1]||null,base:ranks[level],achievements,inventory:(await query('SELECT item FROM inventory WHERE uid=?',user.id)).map(x=>x.item),study:await query('SELECT lesson,at FROM study WHERE uid=? ORDER BY at DESC',user.id),daily:activity.some(x=>x.key==='quest:'+today()),dailyCount:activity.filter(x=>x.kind==='lesson'&&dayOf(x.at)===today()).length,ai:!!process.env.GEMINI_API_KEY};
}
async function openWorld(uid,index){
 return index===0||!!(await one('SELECT 1 FROM activity WHERE uid=? AND key=?',uid,'boss:'+(index-1)));
}
const shuffle = list=>{
 const result=[...list];
 for(let i=result.length-1;i>0;i--){const j=randomInt(i+1);[result[i],result[j]]=[result[j],result[i]];}
 return result;
};
const strip = value=>value.normalize('NFC').replace(/[\u064B-\u065F\u0670]/g,'');
function question(item,pool,type='meaning',size=4){
 const key=type==='arabic'||type==='listen'?'ar':'en';
 const options=shuffle([item[key],...shuffle([...new Set(pool.map(x=>x[key]).filter(x=>x!==item[key]))]).slice(0,size-1)]);
 return {type,item:item.id,prompt:type==='listen'?'Listen and choose the matching Arabic.':type==='arabic'?item.en:item.ar,ar:type==='meaning',audio:type==='listen'?item.ar:null,options,answer:item[key],explanation:item.ar+' · '+item.en+' · '+item.say};
}
async function makeQuestions(kind,target,user,difficulty,visual=false){
 const list=await curriculum(),pool=list.flatMap(x=>x.items), size=difficulty==='Gentle'?3:difficulty==='Challenge'?5:4;
 const unlocked = new Set([0,...(await query("SELECT target FROM activity WHERE uid=? AND kind='boss'",user.id)).map(row=>Number(row.target)+1)]);
 const accessible=list.filter(x=>unlocked.has(x.world)).flatMap(x=>x.items);
 if(kind==='placement'&&target==='quiz'){
  const sample=[list[0]?.items[0],list.find(x=>x.world===1)?.items[0],list.find(x=>x.world===2)?.items[0],list.find(x=>x.world===3)?.items[0],list.find(x=>x.world===4)?.items[0],list.find(x=>x.world===7)?.items[0]].filter(Boolean);
  return sample.map(x=>question(x,pool,'meaning',4));
 }
 if(kind==='lesson'){
  const lesson=list.find(x=>x.id===target);
  if(!lesson||!(await openWorld(user.id,lesson.world)))fail(403,'Finish the previous world to unlock this lesson.');
  await run('INSERT INTO study VALUES(?,?,?) ON CONFLICT(uid,lesson) DO UPDATE SET at=excluded.at',user.id,target,new Date().toISOString());
  return lesson.items.map(x=>question(x,pool,'meaning',size));
 }
 if(kind==='boss'){
  const world=Number(target);
  const subset=list.filter(x=>x.world===world);
  if(String(world)!==target||!worlds[world]||!unlocked.has(world)||!subset.length||(await query("SELECT target FROM activity WHERE uid=? AND kind='lesson'",user.id)).filter(row=>subset.some(lesson=>lesson.id===row.target)).length!==subset.length)fail(403,'Complete all lessons in this world first.');
  return shuffle(subset.flatMap(x=>x.items)).slice(0,8).map((x,i)=>question(x,pool,i%2?'arabic':'meaning',size));
 }
 if(kind==='revision'&&target==='today'){
  const due=await query('SELECT word FROM mastery WHERE uid=? ORDER BY due<=? DESC, misses DESC, due LIMIT 6',user.id,Date.now());
  return (due.length?due.map(x=>pool.find(y=>y.id===x.word)).filter(Boolean):accessible.slice(0,4)).map(x=>question(x,pool,'meaning',size));
 }
 if(kind==='writing'){
  const item=pool.find(x=>x.id===target);
  if(!item)fail(404,'Writing exercise unavailable.');
  return [{type:'trace',prompt:item.ar,item:item.id,answer:'I reviewed my work',explanation:item.ar+' · '+item.en}];
 }
 if(kind==='video'){
  const lesson=list.find(x=>x.id===target);
  if(!lesson)fail(404,'Video lesson unavailable.');
  return lesson.items.slice(0,2).map(x=>question(x,pool,'meaning',size));
 }
 const index=Number(target);
 if(kind!=='game'||String(index)!==target||!games[index]||index===11)fail(404,'Choose a world challenge from the adventure map.');
 const words=pool.filter(x=>/^\p{Script=Arabic}{3,}$/u.test(strip(x.ar)));
 const phrases=pool.filter(x=>strip(x.ar).split(' ').length>=2);
 if(index===1){
  const pairs=shuffle(words).slice(0,difficulty==='Gentle'?2:4);
  return [{type:'memory',prompt:'Find the Arabic and English pairs',options:shuffle(pairs.flatMap(x=>[x.ar,x.en])),answer:JSON.stringify(pairs.map(x=>[x.ar,x.en].sort().join('|')).sort()),explanation:pairs.map(x=>x.ar+' · '+x.en).join(' / ')}];
 }
 if(index===3||index===5)return shuffle(index===3?words:phrases).slice(0,4).map(x=>{
  const tokens=index===3?[...strip(x.ar)]:x.ar.split(' ');
  return {type:'order',item:x.id,prompt:x.en,options:shuffle(tokens),answer:tokens.join(index===3?'':' '),join:index===3?'':' ',explanation:x.ar+' · '+x.en};
 });
 if(index===8){const x=shuffle(words)[0];return [{type:'trace',item:x.id,prompt:x.ar,answer:'I reviewed my work',explanation:x.ar+' · '+x.en}];}
 if(index===10)return shuffle(scenes).slice(0,3).map(([title,prompt,answer])=>({type:'choice',ar:true,prompt,options:shuffle([answer,...shuffle(scenes.map(x=>x[2]).filter(x=>x!==answer)).slice(0,size-1)]),answer,explanation:title+' · '+answer}));
 if(index===9)return shuffle(phrases.filter(x=>x.ar.split(' ').length>2)).slice(0,4).map(item=>{
  const tokens=item.ar.split(' ');const answer=tokens.at(-1);tokens[tokens.length-1]='✗';
  return {type:'choice',ar:true,prompt:tokens.join(' ')+'  ·  '+item.en,options:shuffle([answer,...shuffle([...new Set(phrases.map(x=>x.ar.split(' ').at(-1)))].filter(x=>x!==answer)).slice(0,size-1)]),answer,explanation:item.ar+' · '+item.en};
 });
 return shuffle(words).slice(0,5).map(x=>question(x,words,index===4&&!visual?'listen':index===4||index===2?'arabic':'meaning',size));
}
function expose(q){const {answer,explanation,...display}=q;return display;}
async function submit(user,body){
 return transact(async()=>{
  const attempt=await one('SELECT * FROM attempts WHERE id=? AND uid=?',text(body.id),user.id);
  if(!attempt||attempt.finished)fail(409,'This activity has already ended. Start a new round to practise again.');
  if(body.position!==attempt.position)fail(409,'This question has already advanced.');
  const questions=JSON.parse(attempt.questions), q=questions[attempt.position];
  const correct=text(body.answer,2000)===q.answer;
  if(attempt.kind==='placement'){
   const position=attempt.position+1,misses=attempt.misses+Number(!correct),finished=position===questions.length;
   await run('UPDATE attempts SET position=?,misses=?,finished=? WHERE id=?',position,misses,+finished,attempt.id);
   if(!finished)return {correct,position,next:expose(questions[position])};
   const points=questions.length-misses;
   return {correct,finished,score:Math.round(points*100/questions.length),recommendation:['Complete Beginner','Beginner','Intermediate','Advanced'][points<=1?0:points<=3?1:points<=5?2:3],state:await state(user)};
  }
  if(q.item && q.type!=='trace'){
   const old=await one('SELECT * FROM mastery WHERE uid=? AND word=?',user.id,q.item);
   const hits=correct?(old?.hits||0)+1:Math.max(0,(old?.hits||0)-1);
   await run('INSERT INTO mastery VALUES(?,?,?,?,?) ON CONFLICT(uid,word) DO UPDATE SET hits=excluded.hits,misses=excluded.misses,due=excluded.due',user.id,q.item,hits,(old?.misses||0)+Number(!correct),Date.now()+(correct?Math.min(30,2**(hits-1)):0)*86400000);
  }
  if(!correct){
   await run('UPDATE attempts SET misses=misses+1 WHERE id=?',attempt.id);
   return {correct};
  }
  if(q.item&&q.type!=='trace')await award(user.id,'answer:'+attempt.kind+':'+attempt.target+':'+q.item,'answer',q.item,10,0);
  const position=attempt.position+1;
  const finished=position===questions.length;
  await run('UPDATE attempts SET position=?,finished=? WHERE id=?',position,+finished,attempt.id);
  if(!finished)return {correct,position,next:expose(questions[position])};
  const {kind,target}=attempt;
  const key=kind+':'+target+(['game','revision'].includes(kind)?':'+today():'');
  const score=Math.round(100*questions.length/(questions.length+attempt.misses));
  const earned=await award(user.id,key,kind,target,({lesson:50,boss:250,game:30,writing:15,video:20,revision:25})[kind],kind==='boss'?20:kind==='lesson'?5:2,score);
  if(earned&&kind==='boss'&&score===100)await award(user.id,'perfect:'+target,'quiz',target,100,5,score);
  const current=await state(user);
  if(current.dailyCount>=2)await award(user.id,'quest:'+today(),'quest',today(),100,10);
  if(current.weeklyCount>=5)await award(user.id,'weekly:'+current.week,'weekly',current.week,150,12);
  return {correct,finished,score,earned,state:await state(user)};
 });
}
async function bodyOf(req){
 const pieces=[];
 let length=0;
 for await(const chunk of req){
  const bytes=Buffer.from(chunk);
  length+=bytes.byteLength;
  if(length>65536)fail(413,'Request is too large.');
  pieces.push(bytes);
 }
 try{return JSON.parse(Buffer.concat(pieces).toString('utf8')||'{}')||{};}catch{fail(400,'Invalid JSON.');}
}
async function teacherRoom(uid,room){
 const found=await one('SELECT * FROM classrooms WHERE id=? AND teacher=?',room,uid);
 if(!found)fail(403,'This classroom is private.');
 return found;
}
export async function api(req,res,path){
 if(req.method==='GET'&&path==='/api/branding')return {logo:arcade.logo};
 if(process.env.VERCEL&&!postgresEnabled()&&(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN)){
  if(req.method==='GET'&&path==='/api/state')return {preview:true};
  fail(503,'Saved learning is temporarily unavailable while the school database is being connected.');
 }
 try{
  await initialize();
 }catch(error){
  if(process.env.VERCEL&&req.method==='GET'&&path==='/api/state'&&!req.headers.cookie?.includes('lugha=')){
   console.error('School database initialization failed',error.code||error.name);
   return {preview:true};
  }
  throw error;
 }
 let user=await getUser(req);
 if(user&&(user.disabled_at||user.demo&&!demoAllowed(req.headers.host)))user=null;
 if(req.method==='GET'){
  if(path==='/api/state')return user?state(user):null;
  if(path==='/api/content')return curriculum();
  if(!user)fail(401,'Sign in to continue.');
  if(path==='/api/classrooms'&&user.role==='teacher')return query('SELECT id,name,visible FROM classrooms WHERE teacher=?',user.id);
   if(path==='/api/classroom-rankings')return query(`
   SELECT c.name, c.id AS room, substr(m.uid,1,8) AS alias, COALESCE(SUM(a.xp),0) AS xp
   FROM classrooms c JOIN members viewer ON viewer.room=c.id AND viewer.uid=?
   JOIN members m ON m.room=c.id JOIN users u ON u.id=m.uid AND json_extract(u.profile,'$.leaderboard')=1
   LEFT JOIN activity a ON a.uid=m.uid
   WHERE c.visible=1
   GROUP BY c.id,m.uid ORDER BY c.name,xp DESC
  `,user.id);
  if(path==='/api/parent/children'){if(user.role!=='parent')fail(403,'Parent access required.');return linkedChildren(user.id);}
  if(path==='/api/assignments')return query('SELECT assignments.*,classrooms.name FROM assignments JOIN classrooms ON classrooms.id=assignments.room JOIN members ON members.room=classrooms.id WHERE members.uid=?',user.id);
  if(path==='/api/admin/school'){if(user.role!=='admin')fail(403,'Administrator access required.');if(!postgresEnabled())return null;return adminOverview(user);}
  if(path==='/api/admin'&&user.role==='admin')return postgresEnabled()?query('SELECT email,role FROM users WHERE email IS NOT NULL AND demo=?',!!user.demo):query('SELECT email,role FROM users WHERE email IS NOT NULL');
  fail(404,'Page unavailable.');
 }
 if(req.method!=='POST')fail(405,'Method unavailable.');
 if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)fail(403,'Cross-site request blocked.');
 if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'JSON required.');
 const body=await bodyOf(req);
 if(path==='/api/guest'){
  if(user)return state(user);
  await limit('guest:'+req.socket.remoteAddress,30,3600000);
  const uid=id();
  await run('INSERT INTO users VALUES(?,?,?,?,?)',uid,null,null,'student',JSON.stringify(defaults));
  await session(res,uid);
  return state(await one('SELECT * FROM users WHERE id=?',uid));
 }
 if(path==='/api/recover'){
  if(!postgresEnabled())fail(503,'Password recovery is unavailable on this deployment.');
  await limit('recover:'+req.socket.remoteAddress,4,900000);
  const email=text(body.email,254).toLowerCase();
  if(!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email))fail(400,'Enter your school email address.');
  const registered=await one('SELECT demo,disabled_at FROM users WHERE email=?',email);
  if(registered&&!registered.demo&&!registered.disabled_at){
   const result=await supabaseAuth('recover',{data:{email}});
   if(result.status>=500)fail(502,'Password recovery is temporarily unavailable.');
  }
  return {sent:true};
 }
 if(path==='/api/reset'){
  if(!postgresEnabled())fail(503,'Password recovery is unavailable on this deployment.');
  await limit('reset:'+req.socket.remoteAddress,6,900000);
  const token=text(body.token,256), password=body.password;
  if(!/^[a-zA-Z0-9_-]{20,256}$/.test(token)||typeof password!=='string'||password.length<12||password.length>128)fail(400,'Use a valid link and a password of at least 12 characters.');
  const verification=await supabaseAuth('verify',{data:{token_hash:token,type:'recovery'}});
  if(!verification.ok||!verification.data.access_token||!verification.data.user?.id)fail(400,'This recovery link has expired or already been used.');
  const account=await one('SELECT id,demo,disabled_at FROM users WHERE auth_id=?',verification.data.user.id);
  if(!account||account.demo||account.disabled_at)fail(403,'This account cannot be reset.');
  const result=await supabaseAuth('user',{method:'PUT',token:verification.data.access_token,data:{password}});
  if(!result.ok)fail(400,'Supabase could not update that password.');
  await run('DELETE FROM sessions WHERE uid=?',account.id);
  return {reset:true};
 }
 if(path==='/api/login'||path==='/api/register'){
  await limit('auth:'+req.socket.remoteAddress,20,900000);
  const email=text(body.email,254).toLowerCase(), password=body.password;
  if(!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email)||typeof password!=='string'||password.length<10||password.length>128)fail(400,'Enter a valid email and a password of 10–128 characters.');
  let account;
  if(postgresEnabled()){
   if(path.endsWith('register'))fail(403,'Accounts are created by authorised school administrators.');
   const identity=await supabaseAuth('token?grant_type=password',{data:{email,password}});
   if(identity.status>=500)fail(502,'The school sign-in service is temporarily unavailable.');
   if(!identity.ok||!identity.data.user?.id)fail(401,'The email or password is incorrect.');
   account=await one('SELECT * FROM users WHERE auth_id=?',identity.data.user.id);
   if(!account||account.disabled_at||(account.demo||email.endsWith('@lugha.example'))&&!demoAllowed(req.headers.host))fail(403,'This account is unavailable on this deployment.');
  }else if(path.endsWith('register')){
   account=await one('SELECT * FROM users WHERE email=?',email);
   if(account)fail(409,'This email already has an account.');
   const uid=user&&!user.email?user.id:id();
   const encoded=passwordHash(password);
   if(user&&!user.email)await run('UPDATE users SET email=?,password=? WHERE id=?',email,encoded,uid);
   else await run('INSERT INTO users VALUES(?,?,?,?,?)',uid,email,encoded,'student',JSON.stringify(defaults));
   account=await one('SELECT * FROM users WHERE id=?',uid);
  }else{
   account=await one('SELECT * FROM users WHERE email=?',email);
   const stored=account?.password||'unregistered:'+Buffer.alloc(64).toString('hex');
   const [salt]=stored.split(':');
   if(!timingSafeEqual(Buffer.from(stored.split(':')[1],'hex'),Buffer.from(passwordHash(password,salt).split(':')[1],'hex'))||!account)fail(401,'The email or password is incorrect.');
  }
  if(path.endsWith('login')&&body.role!==undefined&&body.role!==account.role&&!(body.role==='teacher'&&account.role==='admin'))fail(403,'Use the sign-in option assigned to your account.');
  if(user){const token=/\blugha=([a-f0-9]{48})/.exec(req.headers.cookie)?.[1];if(token)await run('DELETE FROM sessions WHERE token=?',hash(token));}
  await session(res,account.id,body.remember===true);
  return state(account);
 }
 if(!user)fail(401,'Sign in to continue.');
 if(path==='/api/logout'){
  const token=/\blugha=([a-f0-9]{48})/.exec(req.headers.cookie)?.[1];
  await run('DELETE FROM sessions WHERE token=?',hash(token));
  res.setHeader('Set-Cookie','lugha=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+((process.env.LUGHA_HTTPS==='1'||process.env.VERCEL)?'; Secure':''));
  return null;
 }
 if(path==='/api/settings'){
  await run('UPDATE users SET profile=? WHERE id=?',JSON.stringify(settings(body,JSON.parse(user.profile))),user.id);
  return state(await one('SELECT * FROM users WHERE id=?',user.id));
 }
 if(path==='/api/study'){
  const lesson=(await curriculum()).find(x=>x.id===body.lesson);
  if(!lesson||!(await openWorld(user.id,lesson.world)))fail(403,'This lesson is locked.');
  await run('INSERT INTO study VALUES(?,?,?) ON CONFLICT(uid,lesson) DO UPDATE SET at=excluded.at',user.id,lesson.id,new Date().toISOString());
  return state(user);
 }
 if(path==='/api/video-progress'){
  const lesson=(await curriculum()).find(item=>item.id===body.lesson);
  if(!lesson||!(await openWorld(user.id,lesson.world)))fail(403,'This lesson is locked.');
  if(!Number.isInteger(body.slide)||body.slide<0||body.slide>=lesson.items.length)fail(400,'Choose a valid slide.');
  return transact(async()=>{
   const previous=await one('SELECT visited,completed_at FROM lesson_viewing WHERE uid=? AND lesson=?',user.id,lesson.id);
   const visited=[...new Set([...(previous?JSON.parse(previous.visited):[]).filter(index=>index<lesson.items.length),body.slide])];
   const completed=previous?.completed_at||(visited.length===lesson.items.length?new Date().toISOString():null);
   const entry={lesson:lesson.id,slide:body.slide,visited:JSON.stringify(visited),completed_at:completed};
   await run('INSERT INTO lesson_viewing VALUES(?,?,?,?,?) ON CONFLICT(uid,lesson) DO UPDATE SET slide=excluded.slide,visited=excluded.visited,completed_at=excluded.completed_at',user.id,entry.lesson,entry.slide,entry.visited,entry.completed_at);
   return entry;
  });
 }
 if(path==='/api/arcade/start'){
  await limit('arcade-start:'+user.id,35,60000);
  const profile=await effectiveProfile(user);
  if(body.lesson!==undefined){
   const lesson=(await curriculum()).find(x=>x.id===body.lesson);
   if(!lesson||!(await openWorld(user.id,lesson.world)))fail(403,'This lesson is locked.');
   return transact(async()=>{
    const result=await arcade.start(user,{...body,world:lesson.world,items:lesson.items,assist:profile.schoolAssist||body.assist===true});
    await run('INSERT INTO learning_journeys(run_id,uid,lesson) VALUES(?,?,?)',result.id,user.id,lesson.id);
    return result;
   });
  }
  return arcade.start(user,{game:body.game,difficulty:body.difficulty,world:body.world,assist:profile.schoolAssist||body.assist===true});
 }
 if(path==='/api/arcade/move'){
  await limit('arcade-move:'+user.id,180,60000);
  const result=await arcade.move(user,body);
  return result.done?{...result,state:await state(user)}:result;
 }
 if(path==='/api/attempt'){
  await limit('round:'+user.id,120,60000);
  const kind=text(body.kind,20),target=text(body.target,60);
  const questions=await makeQuestions(kind,target,user,body.difficulty,body.visual===true);
  if(!questions.length)fail(400,'There are no questions for this activity.');
  const attempt=id();
  await run('INSERT INTO attempts(id,uid,kind,target,questions) VALUES(?,?,?,?,?)',attempt,user.id,kind,target,JSON.stringify(questions));
  return {id:attempt,total:questions.length,position:0,next:expose(questions[0])};
 }
 if(path==='/api/answer'){
  await limit('answer:'+user.id,180,60000);
  return submit(user,body);
 }
 if(path==='/api/shop')return transact(async()=>{
  const item=body.item;
  if(!Number.isInteger(item)||!cosmetics[item])fail(404,'Item unavailable.');
  if(!(await one('SELECT 1 FROM inventory WHERE uid=? AND item=?',user.id,item))){
   if((await state(user)).gems<cosmetics[item][1])fail(400,'You need more gems to unlock this item.');
   await award(user.id,'shop:'+item,'shop',String(item),0,-cosmetics[item][1]);
   await run('INSERT INTO inventory VALUES(?,?)',user.id,item);
  }
  await run('UPDATE users SET profile=? WHERE id=?',JSON.stringify({...JSON.parse(user.profile),equipped:item}),user.id);
  return state(await one('SELECT * FROM users WHERE id=?',user.id));
 });
 if(path==='/api/tutor'){
  if(!process.env.GEMINI_API_KEY)fail(503,'Layla needs a Gemini key. Guided Practice is available now.');
  if(user.role!=='student'||user.email===null)fail(403,'Sign in as a student to use Layla.');
  await limit('ai:'+user.id,8,60000);
  const history=Array.isArray(body.history)?body.history.slice(-10):[];
  const contents=history.filter(turn=>['user','model'].includes(turn?.role)&&text(turn?.text,600)).map(turn=>({role:turn.role,parts:[{text:text(turn.text,600)}]}));
  if(contents.at(-1)?.role!=='user')fail(400,'Send a message first.');
  const profile=await effectiveProfile(user), model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite';
  if(!/^[\w.-]+$/.test(model))fail(503,'The tutor model is configured incorrectly.');
  const instruction='You are Layla, an age-appropriate Modern Standard Arabic tutor. Only discuss learning Arabic. Never ask for identifying information or repeat sensitive information. Explain gently in short steps, one question at a time. Include diacritics in Arabic and plain English explanations. Proficiency: '+profile.level+'. '+(profile.simplified?'Use plain words and one instruction per reply. ':'Use short, friendly explanations. ')+'Offer a short written example. Scenario: '+(tutorTopics[Number(body.topic)]?.title||scenes[Number(body.scene)]?.[0]||scenes[0][0])+'.';
  let response;
  try{
   response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},signal:AbortSignal.timeout(20000),body:JSON.stringify({contents,systemInstruction:{parts:[{text:instruction}]},generationConfig:{maxOutputTokens:650,responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{reply:{type:'STRING'},arabic:{type:'STRING'},transliteration:{type:'STRING'},translation:{type:'STRING'}},required:['reply']}}})});
  }catch{fail(502,'Layla could not connect. Guided Practice is still available.');}
  if(!response.ok)fail(502,response.status===429?'Layla has reached its service quota. Try again later.':'Layla is unavailable. Check the server model and key.');
  const payload=await response.json();
  const reply=payload.candidates?.[0]?.content?.parts?.filter(x=>!x.thought).map(x=>x.text).join(' ');
  if(!reply)fail(502,'Layla could not respond to that message. Try a different Arabic question.');
  let card;
  try{card=JSON.parse(reply);}catch{fail(502,'Layla returned an unreadable response. Please try again.');}
  if(!text(card?.reply,1000))fail(502,'Layla returned an empty response.');
  return {reply:text(card.reply,1000),arabic:text(card.arabic,400),transliteration:text(card.transliteration,400),translation:text(card.translation,400)};
 }
 if(path==='/api/join'){
  const room=await one('SELECT id FROM classrooms WHERE id=?',text(body.code,20).toUpperCase());
  if(!room||user.role!=='student'||!user.email)fail(400,'Use a student account and a valid classroom code.');
  await run('INSERT OR IGNORE INTO members VALUES(?,?)',room.id,user.id);
  return {joined:true};
 }
 if(path.startsWith('/api/classroom')){
  if(user.role!=='teacher')fail(403,'Teacher permissions required.');
  if(path==='/api/classroom/create'){
   const name=text(body.name,60);
   if(!name)fail(400,'Enter a classroom name.');
   const code=randomBytes(6).toString('hex').toUpperCase();
   await run('INSERT INTO classrooms VALUES(?,?,?,0)',code,user.id,name);
   return {code};
  }
  const room=await teacherRoom(user.id,text(body.room,20));
  if(path==='/api/classroom/assign'){
   if(typeof body.lesson!=='string'||!((await curriculum()).some(x=>x.id===body.lesson)||body.lesson.startsWith('videos/')&&(await curriculum()).some(x=>x.id===body.lesson.slice(7))||body.lesson.startsWith('arcade/')&&Object.hasOwn(cabinets,body.lesson.slice(7))))fail(400,'Choose a lesson or arcade mission.');
   await run('INSERT INTO assignments VALUES(?,?,?,?)',id(),room.id,body.lesson,text(body.title,80)||'Lesson assignment');
   return {saved:true};
  }
  if(path==='/api/classroom/learning')return classLearning(room.id);
  if(path==='/api/classroom/assignments'){
   return query(`
    SELECT a.id,a.title,a.lesson,COUNT(m.uid) AS assigned,COUNT(CASE WHEN EXISTS(
      SELECT 1 FROM activity e WHERE e.uid=m.uid AND (
       (a.lesson LIKE 'arcade/%' AND e.kind='arcade' AND e.target=substr(a.lesson,8)) OR
       (a.lesson LIKE 'videos/%' AND e.kind='video' AND e.target=substr(a.lesson,8)) OR
       (e.kind='lesson' AND e.target=a.lesson)
      )
    ) THEN 1 END) AS completed
    FROM assignments a LEFT JOIN members m ON a.room=m.room WHERE a.room=? GROUP BY a.id
   `,room.id);
  }
  if(path==='/api/classroom/visibility'){
   await run('UPDATE classrooms SET visible=? WHERE id=?',+!!body.visible,room.id);
   return {saved:true};
  }
  return query(`SELECT substr(m.uid,1,8) AS alias, COALESCE(SUM(a.xp),0) AS xp, COUNT(CASE WHEN a.kind='lesson' THEN 1 END) AS lessons FROM members m LEFT JOIN activity a ON a.uid=m.uid WHERE room=? GROUP BY m.uid ORDER BY xp DESC`,room.id);
 }
 if(path==='/api/admin/school'){
  if(user.role!=='admin')fail(403,'Administrator access required.');
  if(!postgresEnabled())fail(503,'Connect Supabase to manage school accounts.');
  return manageSchool(user,body,defaults,fail);
 }
 if(path==='/api/admin/lesson'){
  if(user.role!=='admin')fail(403,'Administrator permissions required.');
  const lesson=body.lesson;
  if(!lesson||!/^l[\da-f]{1,25}$/.test(lesson.id)||!Number.isInteger(lesson.world)||!worlds[lesson.world]||!text(lesson.title)||!Array.isArray(lesson.items)||lesson.items.length<2||lesson.items.length>24)fail(400,'Enter a valid lesson with 2–24 items.');
  const items=lesson.items.map((x,i)=>({id:'w'+lesson.id.slice(1)+'-'+i,ar:text(x?.ar,250),en:text(x?.en,250),say:text(x?.say,250)}));
  if(items.some(x=>!x.ar||!x.en||!x.say))fail(400,'Each item needs Arabic, meaning and transliteration.');
  await run('INSERT INTO content VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',lesson.id,JSON.stringify({id:lesson.id,title:text(lesson.title),world:lesson.world,items}));
  return curriculum();
 }
 fail(404,'Page unavailable.');
}
const arcade=arcadeService({
 run,one,query,transact,fail,award,id,randomInt,day:today,
 async questions(user,level,world,game,items){
  const list=await curriculum();
  const profile=JSON.parse(user.profile);
  const proficiency=['Complete Beginner','Beginner','Intermediate','Advanced'].indexOf(profile.level);
  const recent=new Set((await query('SELECT lesson FROM study WHERE uid=? ORDER BY at DESC LIMIT 8',user.id)).map(x=>x.lesson));
  const review=new Set((await query('SELECT word FROM mastery WHERE uid=? AND (misses>0 OR due<=?) ORDER BY misses DESC,due LIMIT 20',user.id,Date.now())).map(x=>x.word));
  const gamesWorld=game==='cross'?6:game==='invaders'&&level>1?3:null;
  const valid=Number.isInteger(world)&&worlds[world]?world:gamesWorld;
  const themed=valid===null?list.filter(x=>x.world<=Math.min(7,2+proficiency+level)):list.filter(x=>x.world===valid);
  const pool=items||themed.flatMap(x=>x.items);
  const favoured=items?[]:themed.flatMap(x=>x.items.filter(w=>recent.has(x.id)||review.has(w.id)));
  const sample=[...new Map([...shuffle(favoured).slice(0,2),...shuffle(pool)].map(w=>[w.id,w])).values()].slice(0,level>=2?6:5);
  return sample.map(w=>question(w,pool,'arabic',level===0||game==='dash'?3:4));
 },
 async studyWord(uid,word,correct){
  const old=await one('SELECT hits,misses FROM mastery WHERE uid=? AND word=?',uid,word);
  const hits=correct?(old?.hits||0)+1:Math.max(0,(old?.hits||0)-1);
  await run('INSERT INTO mastery VALUES(?,?,?,?,?) ON CONFLICT(uid,word) DO UPDATE SET hits=excluded.hits,misses=excluded.misses,due=excluded.due',uid,word,hits,(old?.misses||0)+Number(!correct),Date.now()+(correct?Math.min(30,2**(hits-1)):0)*86400000);
 }
});
