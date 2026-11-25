import {randomBytes} from 'node:crypto';
import { routeToRune } from './arcade.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('learning, account persistence and access control',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'lugha-test-')),dbPath=join(dir,'test.sqlite');
 const demoSecret=randomBytes(16).toString('hex');
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',LUGHA_DB:dbPath,LUGHA_HTTPS:'0',LUGHA_ENABLE_DEMOS:'1',LUGHA_LOCAL_DEMO_PASSWORD:demoSecret,GEMINI_API_KEY:''},stdio:['ignore','pipe','inherit']});
 t.after(async()=>{const done=once(child,'exit');child.kill();await done;rmSync(dir,{recursive:true,force:true});});
 const [line]=await once(child.stdout,'data');
 const port=String(line).match(/port (\d+)/)[1];
 const base='http://127.0.0.1:'+port;
 const db=new DatabaseSync(dbPath);
 t.after(()=>db.isOpen&&db.close());
 const client=()=>{
  let cookie='';
  return async(path,data,expected=200)=>{
   const res=await fetch(base+'/api/'+path,{method:data===undefined?'GET':'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
   assert.equal(res.status,expected,path);
   if(res.headers.has('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
   return res.json();
  };
 };
 const user=client(), stranger=client(), teacher=client(), admin=client();
 const complete=async(who,start)=>{
  const attempt=await who('attempt',start);
  const questions=JSON.parse(db.prepare('SELECT questions FROM attempts WHERE id=?').get(attempt.id).questions);
  assert.equal(Object.hasOwn(attempt.next,'answer'),false);
  let result;
  for(const [position,q] of questions.entries())result=await who('answer',{id:attempt.id,position,answer:q.answer});
  assert.equal(result.finished,true);
  assert.equal(result.score,100);
  return {attempt,result};
 };
 const demoParent=client(),demoStudent=client(),demoTeacher=client();
 const password=demoSecret;
 await demoParent('login',{email:'parent@lugha.example',password,role:'student'},403);
 assert.equal((await demoParent('login',{email:'parent@lugha.example',password,role:'parent'})).demo,true);
 const linked=await demoParent('parent/children');
 assert.equal(linked.length,2);
 assert.ok(linked.every(x=>!Object.hasOwn(x,'support')&&!Object.hasOwn(x,'external_id')));
 const support=await demoStudent('login',{email:'student@lugha.example',password,role:'student'});
 assert.equal(support.profile.schoolAssist,true);
 assert.equal(support.profile.english,120);
 await demoStudent('parent/children',undefined,403);
 const supported=await demoStudent('arcade/start',{game:'maze',lesson:'l0',assist:false});
 assert.equal(supported.config.assist,true);
 await demoTeacher('login',{email:'teacher@lugha.example',password,role:'teacher'});
 assert.equal((await demoTeacher('classrooms'))[0].id,'DEMOCLASS');
 await demoTeacher('classroom/assign',{room:'DEMOCLASS',lesson:'videos/l0',title:'Narrated slides'});
 assert.equal((await demoTeacher('classroom/assignments',{room:'DEMOCLASS'}))[0].assigned,2);
 await demoParent('classroom/assignments',{room:'DEMOCLASS'},403);
 const classData=await demoTeacher('classroom/learning',{room:'DEMOCLASS'});
 assert.equal(classData.length,2);
 assert.ok(classData.some(student=>student.accommodations.includes('Untimed games')));
 await demoParent('classroom/learning',{room:'DEMOCLASS'},403);
 await demoStudent('video-progress',{lesson:'l0',slide:9},400);
 for(let slide=0;slide<4;slide++)await demoStudent('video-progress',{lesson:'l0',slide});
 const resumed=(await demoStudent('state')).viewing.find(item=>item.lesson==='l0');
 assert.equal(resumed.slide,3);
 assert.ok(resumed.completed_at);
 await demoStudent('admin/school',undefined,403);
 const all=await user('content');
 assert.equal(new Set(all.map(x=>x.world)).size,8);
 assert.equal(all.length,50);
 assert.ok(all.flatMap(x=>x.items).length>=400);
 assert.equal(all.filter(x=>x.world===0).flatMap(x=>x.items).length,28);
 for(const asset of ['/','/app.mjs','/style.css','/noor.png','/curriculum.mjs'])assert.equal((await fetch(base+asset)).status,200);
 assert.equal(await user('state'),null);
 assert.equal((await user('guest',{})).achievements.length,33);
 await user('settings',{name:'Noor Student',mode:'Special',onboarded:true});
 const credentials={email:'learner@example.test',password:'password-123456'};
 await user('register',credentials);
 await user('settings',{mode:'Normal'});
 await user('settings',{mode:'Dyslexia',arabic:130,motion:true});
 const history=await user('study',{lesson:'l0'});
 assert.equal(history.study[0].lesson,'l0');
 await user('attempt',{kind:'lesson',target:'l7'},403);
 await user('attempt',{kind:'boss',target:'0'},403);
 const check=await user('attempt',{kind:'lesson',target:'l0'});
 const retry=await user('answer',{id:check.id,position:0,answer:'An incorrect answer'});
 assert.deepEqual(retry,{correct:false});
 const listeningText=await user('attempt',{kind:'game',target:'4',visual:true});
 assert.equal(listeningText.next.type,'arabic');
 assert.equal(listeningText.next.audio,null);
 assert.equal(Object.hasOwn(listeningText.next,'answer'),false);
 const first=await complete(user,{kind:'lesson',target:'l0'});
 assert.equal(first.result.state.xp,90);
 assert.equal(first.result.state.gems,5);
 assert.equal(first.result.state.streak,1);
 assert.equal(first.result.state.achievements[0][2],true);
 await user('answer',{id:first.attempt.id,position:3,answer:'test'},409);
 const replay=await complete(user,{kind:'lesson',target:'l0'});
 assert.equal(replay.result.state.xp,90);
 assert.equal(replay.result.earned,false);
 for(const lesson of all.filter(x=>x.world===0&&x.id!=='l0'))await complete(user,{kind:'lesson',target:lesson.id});
 const boss=await complete(user,{kind:'boss',target:'0'});
 assert.deepEqual(boss.result.state.bosses,[0]);
 assert.equal(boss.result.state.daily,true);
 assert.equal(boss.result.state.weeklyCount,7);
 assert.ok(boss.result.state.activity.some(x=>x.kind==='weekly'));
 assert.equal(boss.result.state.dailyCount,7);
 await complete(user,{kind:'lesson',target:'l7'});
 for(let i=0;i<11;i++)await complete(user,{kind:'game',target:String(i),difficulty:'Gentle'});
 await complete(user,{kind:'writing',target:'w0-0'});
 await complete(user,{kind:'video',target:'l0'});
 await complete(user,{kind:'revision',target:'today'});
 const placement=await complete(user,{kind:'placement',target:'quiz'});
 assert.equal(placement.result.recommendation,'Advanced');
 const equipped=await user('shop',{item:0});
 assert.deepEqual(equipped.inventory,[0]);
 assert.equal((await user('shop',{item:0})).gems,equipped.gems);
 await user('tutor',{history:[{role:'user',text:'Hello'}]},503);
 await user('logout',{});
 assert.equal(await user('state'),null);
 const loaded=await user('login',credentials);
 const play=async ()=>{
  const round=await user('arcade/start',{game:'maze',lesson:'l0',difficulty:'Explorer',assist:true});
  assert.equal(Object.hasOwn(round.next,'answer'),false);
  await user('arcade/move',{id:round.id,turn:0,inputs:'.'},422);
  const questions=JSON.parse(db.prepare('SELECT questions FROM arcade_runs WHERE id=?').get(round.id).questions);
  const first=questions[0];
  const wrong=first.options.findIndex(x=>x!==first.answer);
  const retry=await user('arcade/move',{id:round.id,turn:0,inputs:routeToRune(round.config,first.options.length,0,wrong)});
  assert.equal(retry.correct,false);
  assert.equal(retry.position,0);
  assert.equal(Object.hasOwn(retry,'answer'),false);
  let result;
  for(const [index,q] of questions.entries()){
   const turn=index+1;
   result=await user('arcade/move',{id:round.id,turn,inputs:routeToRune(round.config,q.options.length,turn,q.options.indexOf(q.answer)),score:999999});
  }
  assert.equal(result.done,true);
  assert.equal(result.accuracy,Math.round(100*questions.length/(questions.length+1)));
  assert.ok(result.score<1200);
  assert.equal(result.best.score,result.state.arcadeBests[0].score);
  await user('arcade/move',{id:round.id,turn:5,inputs:'e'},409);
  return result;
 };
 assert.equal((await play()).earned,true);
 assert.equal((await play()).earned,false);
 assert.equal((await user('state')).journeys.length,2);
 assert.equal(loaded.profile.mode,'Dyslexia');
 assert.equal(loaded.profile.arabic,130);
 assert.equal(loaded.completed.length,8);
 await stranger('guest',{});
 assert.deepEqual((await stranger('state')).completed,[]);
 await stranger('answer',{id:first.attempt.id,position:0,answer:'test'},409);
 await stranger('classroom/create',{name:'Forbidden'},403);
 await stranger('admin/lesson',{lesson:all[0]},403);
 const arcadeRoutes={
  dash:(_,index)=>['w','.','e'][index]+'.'.repeat(13),
  invaders:(_,index)=>['wwww','ww','','ee'][index]+'x.....',
  snake:(round,index,count,turn)=>routeToRune(round.config,count,turn,index),
  blocks:(_,index)=>['wwww','w','e','eeee'][index]+'x',
  cross:(round,index,count,turn)=>routeToRune(round.config,count,turn,index),
  ninja:(_,index)=>['wwww','w','e','eeee'][index]+'x',
  launch:(_,index)=>['s','','n','nn'][index]+'x......',
  quest:(_,index)=>['nwwwww','ww','ee','neeeee'][index],
  race:(_,index)=>['wwww','w','e','eeee'][index]+'.'.repeat(16)
 };
 for(const [game,path] of Object.entries(arcadeRoutes)){
  const round=await user('arcade/start',{game,difficulty:'Adventurer',assist:true});
  const questions=JSON.parse(db.prepare('SELECT questions FROM arcade_runs WHERE id=?').get(round.id).questions);
  let result;
  for(const [turn,q] of questions.entries()){
   result=await user('arcade/move',{id:round.id,turn,inputs:path(round,q.options.indexOf(q.answer),q.options.length,turn)});
   assert.equal(result.correct,true,game);
  }
  assert.equal(result.done,true);
  assert.equal(result.accuracy,100);
 }
 assert.equal((await user('state')).arcadeBests.length,10);
 assert.deepEqual((await stranger('state')).arcadeBests,[]);
 const teacherCredentials={email:'teacher@example.test',password:'password-123456'};
 await teacher('register',teacherCredentials);
 db.prepare("UPDATE users SET role='teacher' WHERE email=?").run(teacherCredentials.email);
 const {code}=await teacher('classroom/create',{name:'Arabic Club'});
 await user('join',{code});
 await teacher('classroom/assign',{room:code,lesson:'l0',title:'Starter'});
 assert.equal((await user('assignments'))[0].title,'Starter');
 await teacher('classroom/assign',{room:code,lesson:'arcade/maze',title:'Arcade round'});
 assert.ok((await user('assignments')).some(x=>x.lesson==='arcade/maze'));
 assert.equal((await teacher('classroom/report',{room:code}))[0].lessons,8);
 assert.deepEqual(await user('classroom-rankings'),[]);
 await teacher('classroom/visibility',{room:code,visible:true});
 assert.deepEqual(await user('classroom-rankings'),[]);
 await user('settings',{leaderboard:true});
 assert.equal((await user('classroom-rankings')).length,1);
 assert.deepEqual(await stranger('classroom-rankings'),[]);
 await teacher('classroom/report',{room:'PRIVATE'},403);
 const adminCredentials={email:'admin@example.test',password:'password-123456'};
 await admin('register',adminCredentials);
 db.prepare("UPDATE users SET role='admin' WHERE email=?").run(adminCredentials.email);
 await admin('admin/lesson',{lesson:{...all[0],title:'Test revision'}});
 assert.equal((await user('content'))[0].title,'Test revision');
 db.close();
});
