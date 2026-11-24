import assert from 'node:assert/strict';
import test from 'node:test';
import { arcadeBoard, arcadeStep, directions, replayArcade } from '../public/arcade-engine.mjs';

export function routeToRune(config,count,turn,index){
 const start=arcadeBoard(config.game,count,config.seed,turn,config.level,config.assist);
 const goal=start.targets[index].join(',');
 const excluded=new Set(start.targets.filter((_,i)=>i!==index).map(x=>x.join(',')));
 const queue=[[start.player,'']],visited=new Set([start.player.join(',')]);
 for(const [p,path] of queue){
  if(p.join(',')===goal)return path;
  for(const [action,[dx,dy]] of Object.entries(directions)){
   const x=p[0]+dx,y=p[1]+dy,k=[x,y].join(',');
   if(!start.map[y]?.[x]||start.map[y][x]==='#'||visited.has(k)||excluded.has(k))continue;
   visited.add(k);queue.push([[x,y],path+action]);
  }
 }
 throw Error('Rune cannot be reached');
}

test('maze movement, wall collision, energy and all target routes',()=>{
 const config={game:'maze',level:0,assist:true};
 for(let seed=0;seed<12;seed++)for(let turn=0;turn<4;turn++)for(let target=0;target<4;target++){
  config.seed=seed;
  const path=routeToRune(config,4,turn,target);
  const result=replayArcade(config,4,turn,path);
  assert.equal(result.hit,target);
  assert.ok(result.score>0);
 }
 const board=arcadeBoard('maze',3,0,0,0,true);
 arcadeStep(board,'n');
 assert.deepEqual(board.player,[5,2]);
 arcadeStep(board,'w');
 assert.deepEqual(board.player,[5,2]);
 const contested=arcadeBoard('maze',3,0,0,0,false);
 contested.enemy=[5,2];arcadeStep(contested,'n');
 assert.equal(contested.bumps,1);
 assert.deepEqual(contested.player,contested.spawn);
});
test('desert lanes, jumping and gate collisions',()=>{
 const config={game:'dash',seed:1,level:0,assist:true};
 for(const [i,lead] of ['w','.','e'].entries())assert.equal(replayArcade(config,3,0,lead+'.'.repeat(13)).hit,i);
 const jump=arcadeBoard('dash',3,1,0,0,false);
 for(const command of '......n.')arcadeStep(jump,command);
 assert.equal(jump.bumps,0);
 const crash=replayArcade({...config,assist:false},3,0,'.'.repeat(8));
 assert.equal(crash.bumps,1);
});
test('a star pulse hits only a target in its flight path',()=>{
 const config={game:'invaders',seed:0,level:0,assist:true};
 for(const [i,path] of ['wwww','ww','','ee'].entries())assert.equal(replayArcade(config,4,0,path+'x.....').hit,i);
 assert.equal(replayArcade(config,4,0,'wx.....').hit,null);
});
test('snake grows by checkpoint and resets on wall collisions',()=>{
 const config={game:'snake',seed:4,level:0,assist:true};
 for(let turn=0;turn<3;turn++)for(let i=0;i<4;i++)assert.equal(replayArcade(config,4,turn,routeToRune(config,4,turn,i)).hit,i);
 const result=replayArcade({...config,assist:false},4,0,'n'.repeat(4));
 assert.equal(result.bumps,1);
});
test('falling block rotates and locks into each slot',()=>{
 const config={game:'blocks',seed:0,level:1,assist:true};
 const board=arcadeBoard('blocks',4,0,0,1,true);
 arcadeStep(board,'n');
 assert.equal(board.rotated,true);
 for(const [i,path] of ['wwww','w','e','eeee'].entries())assert.equal(replayArcade(config,4,0,path+'x').hit,i);
 assert.equal(replayArcade(config,4,0,'x').bumps,1);
});
test('crossing routes and traffic collisions',()=>{
 const config={game:'cross',seed:0,level:0,assist:true};
 for(let i=0;i<4;i++)assert.equal(replayArcade(config,4,0,routeToRune(config,4,0,i)).hit,i);
 assert.ok(replayArcade({...config,assist:false,seed:1},4,0,'nnnnnnnnnn').bumps>0);
});
test('word swipe requires cursor proximity',()=>{
 const config={game:'ninja',seed:0,level:0,assist:true};
 for(const [i,path] of ['wwww','w','e','eeee'].entries())assert.equal(replayArcade(config,4,0,path+'x').hit,i);
 assert.equal(replayArcade(config,4,0,'x').hit,null);
});
test('launch angle controls which structure the star reaches',()=>{
 const config={game:'launch',seed:0,level:0,assist:true};
 for(const [i,path] of ['s','','n','nn'].entries())assert.equal(replayArcade(config,4,0,path+'x'+'......').hit,i);
 assert.equal(replayArcade(config,4,0,'wx'+'......').hit,null);
});
test('quest requires jumping over gaps in normal play',()=>{
 const config={game:'quest',seed:0,level:1,assist:true};
 for(const [i,path] of ['nwwwww','ww','ee','neeeee'].entries())assert.equal(replayArcade(config,4,0,path).hit,i);
 assert.equal(replayArcade({...config,assist:false},3,0,'eeee').hit,2);
 const board=arcadeBoard('quest',4,0,0,1,false);
 board.player=[8,5];
 arcadeStep(board,'e');assert.equal(board.bumps,1);
 board.player=[8,5];
 arcadeStep(board,'n');arcadeStep(board,'e');assert.deepEqual(board.player,[9,4]);
});
test('race checkpoint validates the lane after the lap advances',()=>{
 const config={game:'race',seed:0,level:0,assist:true};
 for(const [i,path] of ['wwww','w','e','eeee'].entries())assert.equal(replayArcade(config,4,0,path+'.'.repeat(16-path.length)).hit,i);
 assert.equal(replayArcade(config,4,0,'.'.repeat(16)).hit,null);
});

