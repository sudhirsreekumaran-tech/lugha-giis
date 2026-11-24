export const difficulty = ['Explorer','Adventurer','Champion','Master'];
export const cabinets = {
 maze: {title:'Arabic Maze Muncher',icon:'◈',colour:'blue',description:'Collect sparks, dodge the sentries and find the right rune.',instructions:'Move through the corridors to collect the matching rune. A shield orb protects you briefly.'},
 dash: {title:'Arabic Desert Dash',icon:'☀',colour:'peach',description:'Run through desert, garden and waterfront routes.',instructions:'Switch lanes, jump over rocks with Up, and slide under barriers with Down. Enter the matching gate.',action:'Advance'},
 invaders: {title:'Word Invaders',icon:'✦',colour:'lavender',description:'Pilot a ship and tag floating Arabic targets with star pulses.',instructions:'Steer left and right. Press Space or Pulse to launch a star toward a matching target.',action:'Pulse'},
 snake: {title:'Arabic Snake',icon:'∿',colour:'mint',description:'Steer a growing snake through a grid of Arabic runes.',instructions:'Keep turning to collect the matching rune. Avoid the walls and your own tail. In assist mode the snake moves when you press a direction.'},
 blocks: {title:'Arabic Block Builder',icon:'▦',colour:'blue',description:'Guide falling blocks into the matching Arabic slot.',instructions:'Move a falling piece left or right. Press Up to rotate its shape, Down to descend, or Drop to lock the piece in a rune slot.',action:'Drop'},
 cross: {title:'Cross the Emirates',icon:'♧',colour:'mint',description:'Navigate moving traffic to reach an Emirati heritage rune.',instructions:'Cross the paths with the directional controls. Reach the matching rune across the far bank.'},
 ninja: {title:'Word Ninja',icon:'✧',colour:'pink',description:'Intercept airborne words with a ribbon swipe.',instructions:'Move the cursor with the controls and press Swipe when it overlaps the matching word. You can also tap an adjacent target.',action:'Swipe'},
 launch: {title:'Vocabulary Launch',icon:'➶',colour:'yellow',description:'Choose an arc and send a star to the matching structure.',instructions:'Aim left or right and use Up or Down to change angle. Press Launch to test the arc. Adjust and retry missed shots.',action:'Launch'},
 quest: {title:'LUGHA Quest',icon:'♜',colour:'peach',description:'Jump across gaps and discover treasure checkpoints.',instructions:'Move right or left. Use Jump or Up to clear gaps. Match the rune below the correct pedestal to advance.',action:'Jump'},
 race: {title:'Arabic Grand Prix',icon:'⚑',colour:'lavender',description:'Steer through a checkpoint circuit alongside a rival.',instructions:'Change lanes with Left and Right. Advance to cross the matching checkpoint gate. Pull ahead by driving cleanly.',action:'Advance'}
};
export const directions = {n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]};
const layouts = [
 ['...........','.##.#.#.##.','....#.#....','.#.......#.','....#.#....','.##.#.#.##.','...........'],
 ['...........','..#.#.#.#..','.##.....##.','.....#.....','.##.....##.','..#.#.#.#..','...........'],
 ['...........','.#.#...#.#.','.#...#...#.','...#...#...','.#...#...#.','.#.#...#.#.','...........']
];
export const width=11,height=7;
const corners = [[0,0],[10,0],[10,6],[0,6]];
const same = (a,b)=>a[0]===b[0]&&a[1]===b[1];
const key = ([x,y])=>y*width+x;
const bounded = ([x,y])=>x>=0&&x<width&&y>=0&&y<height;
const moved = (point,action)=>directions[action]?point.map((p,i)=>p+directions[action][i]):point;
const walkable = (board,p)=>bounded(p)&&board[p[1]][p[0]]!== '#';
export function arcadeBoard(game,options,seed,position,level,assist){
 if(game!=='maze')return variantBoard(game,options,seed,position,level,assist);
 const map=layouts[(seed+position)%layouts.length];
 const spawn=map[3][5]==='#'?[5,2]:[5,3];
 const shift=(seed+position)%4;
 const targets=Array.from({length:options},(_,i)=>corners[(i+shift)%4]);
 return {game,map,spawn,player:spawn,targets,level,assist,tick:0,score:0,shield:0,dots:new Set(),hit:null,bumps:0,enemy:[5,0],orb:[5,6],orbUsed:false,trail:[],direction:'e',seed,position};
}
export function arcadeStep(board,action){
 if(board.hit!==null||!['n','e','s','w','.','x'].includes(action))return;
 board.tick++;
 if(board.game!=='maze'){variantStep(board,action);return;}
 if(board.shield>0)board.shield--;
 const player=moved(board.player,action);
 if(walkable(board.map,player))board.player=player;
 if(!board.dots.has(key(board.player))){board.dots.add(key(board.player));board.score++;}
 if(!board.orbUsed&&same(board.player,board.orb)){board.shield=12;board.orbUsed=true;board.score+=5;}
 if(!board.assist&&board.tick%(5-board.level)===0){
  const order=(board.seed+board.position)%2===0?[0,1]:[1,0];
  const choices=order.map(axis=>board.enemy.map((value,i)=>i===axis?value+Math.sign(board.player[i]-value):value));
  board.enemy=choices.find(point=>!same(point,board.enemy)&&walkable(board.map,point))||board.enemy;
 }
 if(!board.assist&&same(board.player,board.enemy)&&!board.shield){
  board.player=board.spawn;board.enemy=[5,0];board.bumps++;board.shield=5;return;
 }
 const hit=board.targets.findIndex(target=>same(target,board.player));
 if(hit>=0)board.hit=hit;
}
export function replayArcade(config,options,position,inputs){
 const board=arcadeBoard(config.game,options,config.seed,position,config.level,config.assist);
 for(const action of inputs)arcadeStep(board,action);
 return board;
}

const lanes=[2,5,8];
const openMap=Array.from({length:height},()=>'.'.repeat(width));
function variantBoard(game,count,seed,position,level,assist){
 const base={game,map:openMap,spawn:[5,6],player:[5,6],targets:[],tick:0,score:0,shield:0,dots:new Set(),hit:null,bumps:0,hazards:[],trail:[],direction:'e',level,assist,seed,position,count,projectile:null};
 if(game==='dash'){
  base.lane=1;
  base.targets=Array.from({length:count},(_,i)=>[lanes[i],0]);
 }else if(game==='invaders'){
  base.targets=Array.from({length:count},(_,i)=>[1+i*2,1]);
 }else if(game==='snake'){
  base.spawn=base.player=[5,3];
  base.map=position%2?layouts[2]:openMap;
  base.spawn=base.player=base.map[3][5]==='#'?[5,2]:[5,3];
  base.targets=Array.from({length:count},(_,i)=>corners[(i+seed+position)%4]);
 }
 if(game==='blocks'||game==='race'){
  base.spawn=base.player=[5,game==='blocks'?0:6];
  base.slots=[1,4,6,9].slice(0,count);
  base.targets=base.slots.map(x=>[x,game==='blocks'?6:0]);
 }else if(game==='cross'){
  base.targets=[1,4,6,9].slice(0,count).map(x=>[x,0]);
 }else if(game==='ninja'){
  base.spawn=base.player=[5,3];
  base.targets=[1,4,6,9].slice(0,count).map(x=>[x,2]);
 }else if(game==='launch'){
  base.spawn=base.player=[0,6];
  base.angle=4;
  base.targets=[2,4,6,8].slice(0,count).map(x=>[x,1]);
 }else if(game==='quest'){
  base.spawn=base.player=[5,5];
  base.targets=[0,3,7,10].slice(0,count).map(x=>[x,5]);
  base.hazards=[[1,5],[9,5]];
 }
 return base;
}
function hitAt(board,point){
 const hit=board.targets.findIndex(target=>same(point,target));
 if(hit>=0)board.hit=hit;
}
function bounce(value,span){
 const cycle=value%(span*2);
 return cycle<=span?cycle:span*2-cycle;
}
function stepDash(b,action){
 if(action==='w'||action==='e')b.lane=Math.max(0,Math.min(2,b.lane+(action==='w'?-1:1)));
 if(action==='n'||action==='s'){b.pose=action;b.poseUntil=b.tick+3;}
 b.player=[lanes[b.lane],b.pose==='n'&&b.tick<b.poseUntil?5:6];
 const phase=(b.tick-1)%14+1;
 const obstacleLane=(b.seed+b.position)%3;
 const obstacleType=b.position%2?'s':'n';
 b.targets=b.targets.map(([x])=>[x,Math.max(0,phase-8)]);
 b.hazards=!b.assist&&phase>=3&&phase<=8?[[lanes[obstacleLane],phase-2]]:[];
 if(phase===8&&b.lane===obstacleLane&&!b.assist&&(b.pose!==obstacleType||b.tick>=b.poseUntil)){b.bumps++;b.score=Math.max(0,b.score-10);b.lane=1;}
 if(phase===6&&b.lane===(obstacleLane+1)%3)b.score+=5;
 if(phase===14&&b.lane<b.count)b.hit=b.lane;
}
function stepInvaders(b,action){
 if(action==='w'||action==='e')b.player=[Math.max(0,Math.min(10,moved(b.player,action)[0])),6];
 const shift=b.assist?0:bounce(Math.floor(b.tick/(4-b.level)),3);
 b.targets=b.targets.map((_,i)=>[1+i*2+shift,(b.position%2)+1]);
 if(action==='x'&&!b.projectile)b.projectile=[b.player[0],5];
 else if(b.projectile){
  b.projectile=[b.projectile[0],b.projectile[1]-1];
  if(b.projectile[1]<0)b.projectile=null;
 }
 if(b.projectile)hitAt(b,b.projectile);
 if(!b.assist){
  b.hazards=[[bounce(b.tick+b.seed,10),(b.tick+b.position)%7]];
  if(same(b.player,b.hazards[0])){b.bumps++;b.player=b.spawn;b.projectile=null;}
 }
}
function stepSnake(b,action){
 if(directions[action])b.direction=action;
 else if(b.assist)return;
 const next=moved(b.player,b.direction);
 if(!walkable(b.map,next)||!b.assist&&b.trail.some(p=>same(p,next))){
  if(b.assist)return;
  b.bumps++;b.player=b.spawn;b.trail=[];return;
 }
 b.trail=[b.player,...b.trail].slice(0,Math.min(6,2+b.position));
 b.player=next;
 if(!b.dots.has(key(next))){b.dots.add(key(next));b.score++;}
 hitAt(b,next);
}
function variantStep(board,action){
 if(board.game==='dash')stepDash(board,action);
 else if(board.game==='invaders')stepInvaders(board,action);
 else if(board.game==='snake')stepSnake(board,action);
 else if(board.game==='blocks')stepBlocks(board,action);
 else if(board.game==='cross')stepCross(board,action);
 else if(board.game==='ninja')stepNinja(board,action);
 else if(board.game==='launch')stepLaunch(board,action);
 else if(board.game==='quest')stepQuest(board,action);
 else if(board.game==='race')stepRace(board,action);
}

function stepBlocks(b,action){
 let [x,y]=b.player;
 if(action==='w'||action==='e')x=Math.max(0,Math.min(10,moved(b.player,action)[0]));
 if(action==='n')b.rotated=!b.rotated;
 if(action==='x')y=6;
 else if(action==='s'||!b.assist&&b.tick%(4-b.level)===0)y=Math.min(6,y+1);
 b.player=[x,y];
 if(y===6){
  hitAt(b,b.player);
  if(b.hit===null){b.bumps++;b.player=b.spawn;}
 }
}
function stepCross(b,action){
 const next=moved(b.player,action);
 if(bounded(next))b.player=next;
 b.hazards=[2,4].flatMap((row,i)=>[0,5].map(offset=>[(b.tick*(i===0?1:2)+offset+b.seed)%width,row]));
 if(!b.assist&&b.hazards.some(p=>same(p,b.player))){b.bumps++;b.player=b.spawn;return;}
 if(!b.dots.has(key(next))&&bounded(next)){b.score++;b.dots.add(key(next));}
 hitAt(b,b.player);
}
function stepNinja(b,action){
 const next=moved(b.player,action);
 if(bounded(next))b.player=next;
 if(!b.assist)b.targets=b.targets.map(([x],i)=>[x,1+bounce(Math.floor(b.tick/(4-b.level))+i*2,4)]);
 if(action==='x'){
  const target=b.targets.findIndex(([x,y])=>Math.abs(x-b.player[0])+Math.abs(y-b.player[1])<=1);
  if(target===-1)b.bumps++;else b.hit=target;
 }
}
function stepLaunch(b,action){
 if(!b.launch){
  if(action==='w'||action==='e')b.angle=Math.max(2,Math.min(8,b.angle+(action==='w'?-1:1)));
  if(action==='n'||action==='s')b.angle=Math.max(2,Math.min(8,b.angle+(action==='n'?2:-2)));
  if(action==='x')b.launch={time:0,angle:b.angle};
 }else{
  const {angle}=b.launch;
  const time=++b.launch.time;
  b.projectile=[Math.round(angle*time/6),Math.round(6-5*(1-((time-6)/6)**2))];
  if(time===6)hitAt(b,b.projectile);
  if(time>12){b.launch=null;b.projectile=null;b.bumps++;}
 }
}
function stepQuest(b,action){
 let x=b.player[0];
 if(action==='x'||action==='n')b.jumpUntil=b.tick+4;
 if(action==='w'||action==='e')x=Math.max(0,Math.min(10,moved(b.player,action)[0]));
 const air=b.tick<(b.jumpUntil||0);
 b.player=[x,air?4:5];
 if(!b.assist&&!air&&b.hazards.some(p=>same(p,b.player))){b.player=b.spawn;b.bumps++;return;}
 if(!b.dots.has(key(b.player))){b.dots.add(key(b.player));b.score++;}
 hitAt(b,b.player);
}
function stepRace(b,action){
 let x=b.player[0];
 if(action==='w'||action==='e')x=Math.max(0,Math.min(10,moved(b.player,action)[0]));
 const phase=(b.tick-1)%16+1;
 b.player=[x,6];
 b.targets=b.slots.map(slot=>[slot,Math.max(0,phase-10)]);
 b.rival=b.assist?null:[(b.seed+b.position)%width,6-bounce(Math.floor(b.tick/2),5)];
 b.hazards=[[1+(b.seed%4)*2,Math.max(0,phase-5)]];
 if(!b.assist&&b.hazards.some(p=>same(p,b.player))&&phase<16){b.bumps++;b.player=b.spawn;}
 if(phase===16)hitAt(b,b.player);
}
