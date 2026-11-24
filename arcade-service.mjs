import {cabinets,difficulty,replayArcade} from './public/arcade-engine.mjs';

export const arcadeSchema = `
 CREATE TABLE IF NOT EXISTS arcade_runs(
   id TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(id),game TEXT NOT NULL,
   config TEXT NOT NULL,questions TEXT NOT NULL,position INTEGER DEFAULT 0,turn INTEGER DEFAULT 0,
   misses INTEGER DEFAULT 0,score INTEGER DEFAULT 0,combo INTEGER DEFAULT 0,done INTEGER DEFAULT 0
 );
 CREATE TABLE IF NOT EXISTS arcade_bests(
   uid TEXT NOT NULL REFERENCES users(id),game TEXT NOT NULL,score INTEGER NOT NULL,
   accuracy INTEGER NOT NULL,PRIMARY KEY(uid,game)
 );
`;

export function arcadeService({run,one,query,transact,fail,award,id,randomInt,day,questions,studyWord}){
 const show=({answer,explanation,...display})=>display;
 return {
  logo:true,
  bests:uid=>query('SELECT game,score,accuracy FROM arcade_bests WHERE uid=? ORDER BY score DESC',uid),
  async start(user,body){
   const game=body.game;
   if(typeof game!=='string'||!Object.hasOwn(cabinets,game))fail(404,'Choose an available arcade game.');
   const requested=difficulty.indexOf(body.difficulty);
   const profile=JSON.parse(user.profile);
   const level=requested<0?(profile.mode==='Normal'?1:0):requested;
   const config={game,seed:randomInt(1000000),level,assist:body.assist===true};
   const selection=await questions(user,level,body.world,game);
   if(!selection.length)fail(409,'No questions are available for this mission.');
   const token=id();
   await run('INSERT INTO arcade_runs(id,uid,game,config,questions) VALUES(?,?,?,?,?)',token,user.id,game,JSON.stringify(config),JSON.stringify(selection));
   return {id:token,config,total:selection.length,position:0,turn:0,next:show(selection[0]),score:0};
  },
  move(user,body){
   return transact(async()=>{
    if(typeof body.id!=='string'||typeof body.inputs!=='string'||!/^([nesw.x]){1,2500}$/.test(body.inputs))fail(400,'Send a valid movement sequence.');
    const row=await one('SELECT * FROM arcade_runs WHERE id=? AND uid=?',body.id,user.id);
    if(!row||row.done||row.turn!==body.turn)fail(409,'This turn has already ended.');
    const list=JSON.parse(row.questions),q=list[row.position],config=JSON.parse(row.config);
    const board=replayArcade(config,q.options.length,row.turn,body.inputs);
    if(board.hit===null)fail(422,'Reach an answer rune before submitting.');
    const correct=q.options[board.hit]===q.answer;
    const combo=correct?row.combo+1:0;
    const position=row.position+Number(correct),done=position===list.length;
    const score=row.score+(correct?board.score+100+(combo%3===0?50:0):0)+(done?250:0);
    const misses=row.misses+Number(!correct);
    await run('UPDATE arcade_runs SET position=?,turn=turn+1,misses=?,score=?,combo=?,done=? WHERE id=?',position,misses,score,combo,+done,row.id);
    await studyWord(user.id,q.item,correct);
    if(!done)return {correct,position,turn:row.turn+1,next:show(list[position]),score,combo};
    const accuracy=Math.round(100*position/(position+misses));
    await run('INSERT INTO arcade_bests VALUES(?,?,?,?) ON CONFLICT(uid,game) DO UPDATE SET score=excluded.score,accuracy=excluded.accuracy WHERE excluded.score>arcade_bests.score OR (excluded.score=arcade_bests.score AND excluded.accuracy>arcade_bests.accuracy)',user.id,row.game,score,accuracy);
    const earned=await award(user.id,'arcade:'+row.game+':'+day(),'arcade',row.game,50,5,accuracy);
    return {correct,done,position,turn:row.turn+1,score,accuracy,combo,earned,best:await one('SELECT score,accuracy FROM arcade_bests WHERE uid=? AND game=?',user.id,row.game)};
   });
  }
 };
}


