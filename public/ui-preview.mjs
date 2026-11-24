import { lessons } from './content.mjs';
import { cabinets, difficulty, replayArcade } from './arcade-engine.mjs';

const previewState={
 profile:{name:'Explorer',level:'Complete Beginner',goal:'Everyday Arabic',mode:'Normal',minutes:10,theme:'Light',avatar:'🦊',english:100,arabic:100,spacing:1.55,speed:.85,motion:false,audioInstructions:false,sound:false,onboarded:true,equipped:-1,leaderboard:false},
 role:'student',guest:true,ai:false,xp:0,gems:0,level:0,base:0,next:150,streak:0,longest:0,
 daily:false,dailyCount:0,weeklyCount:0,days:[],mastery:[],activity:[],completed:[],bosses:[],
 achievements:[],inventory:[],study:[],arcadeBests:[]
};
const mix=list=>list.map(value=>({value,order:Math.random()})).sort((a,b)=>a.order-b.order).map(x=>x.value);
const publicQuestion=({answer,...question})=>question;

export function createPreview(){
 const current=structuredClone(previewState);
 let run;
 return {
  state:current,
  lessons,
  request(path,body){
   if(path==='settings'){Object.assign(current.profile,body);return current;}
   if(path==='assignments'||path==='classroom-rankings')return [];
   if(path==='study'){
    current.study=[{lesson:body.lesson,at:new Date().toISOString()},...current.study.filter(x=>x.lesson!==body.lesson)];
    return current;
   }
   if(path==='arcade/start'){
    if(!Object.hasOwn(cabinets,body.game))throw Error('Choose an available game.');
    const world=body.world??(body.game==='cross'?6:null);
    const pool=lessons.filter(x=>world===null?x.world===2:x.world===world).flatMap(x=>x.items);
    const level=Math.max(0,difficulty.indexOf(body.difficulty));
    const count=level===0||body.game==='dash'?3:4;
    const questions=mix(pool).slice(0,5).map(item=>({
     prompt:item.en,answer:item.ar,
     options:mix([item.ar,...mix([...new Set(pool.map(x=>x.ar).filter(x=>x!==item.ar))]).slice(0,count-1)])
    }));
    run={id:crypto.randomUUID(),config:{game:body.game,level,assist:body.assist,seed:Math.floor(Math.random()*1000000)},questions,position:0,turn:0,score:0,combo:0,misses:0};
    return {id:run.id,config:run.config,total:questions.length,position:0,turn:0,next:publicQuestion(questions[0]),score:0};
   }
   if(path==='arcade/move'){
    if(!run||run.id!==body.id||run.turn!==body.turn)throw Error('Restart this preview round.');
    const q=run.questions[run.position];
    const board=replayArcade(run.config,q.options.length,run.turn,body.inputs);
    if(board.hit===null)throw Error('Reach an answer rune first.');
    const correct=q.options[board.hit]===q.answer;
    run.combo=correct?run.combo+1:0;
    if(correct){run.position++;run.score+=board.score+100+(run.combo%3===0?50:0);}
    else run.misses++;
    run.turn++;
    const {position,turn,combo}=run;
    if(position<run.questions.length)return {correct,position,turn,combo,score:run.score,next:publicQuestion(run.questions[position])};
    const score=run.score+250,accuracy=Math.round(100*position/(position+run.misses)),game=run.config.game;
    const previous=current.arcadeBests.find(x=>x.game===game);
    const best=!previous||score>previous.score?{game,score,accuracy}:previous;
    current.arcadeBests=[...current.arcadeBests.filter(x=>x.game!==game),best];
    return {correct,done:true,position,turn,combo,score,accuracy,best,earned:false,state:current};
   }
   throw Error('This feature needs a connected database. You can play the Arcade or browse lessons in this preview.');
  }
 };
}
