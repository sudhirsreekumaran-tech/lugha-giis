import { arcadeBoard, arcadeStep, cabinets, width, height } from './arcade-engine.mjs';

const tile=44;
const ident='ABCD';
const logicalWidth=width*tile,logicalHeight=height*tile;
const keyboard={ArrowUp:'n',ArrowDown:'s',ArrowLeft:'w',ArrowRight:'e',w:'n',a:'w',s:'s',d:'e',' ':'x'};
const center=point=>point.map(n=>n*tile+tile/2);

function stage(board,canvas,soft){
 const ctx=canvas.getContext('2d');
 const dot=(point,r,colour)=>{
  ctx.fillStyle=colour;
  ctx.beginPath();ctx.arc(...center(point),r,0,Math.PI*2);ctx.fill();
 };
 const background=ctx.createLinearGradient(0,0,logicalWidth,logicalHeight);
 background.addColorStop(0,soft?'#e3f0fb':'#071e36');
 background.addColorStop(1,soft?'#c9e0f2':board.game==='dash'||board.game==='quest'?'#563c44':'#123f68');
 ctx.fillStyle=background;ctx.fillRect(0,0,logicalWidth,logicalHeight);
 board.map.forEach((row,y)=>[...row].forEach((cell,x)=>{
  if(cell==='#'){
   ctx.fillStyle=soft?'#8db7db':'#005baa';
   ctx.fillRect(x*tile+3,y*tile+3,tile-6,tile-6);
  }else if(!board.dots.has(y*width+x))dot([x,y],2,soft?'#47708f':'#91caff');
 }));
 if(board.game==='maze'){
  if(!board.orbUsed)dot(board.orb,8,'#00bff2');
  if(!board.assist)dot(board.enemy,12,'#f7941d');
 }
 drawObstacles(board,ctx,dot);
 board.targets.forEach((point,i)=>{
  dot(point,16,soft?'#c5dea2':'#a4ce39');
  ctx.font='700 19px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#09294b';
  const [x,y]=center(point);ctx.fillText(ident[i],x,y+1);
 });
 if(board.shield)dot(board.player,17,'#00bff2');
 for(const part of board.trail)dot(part,8,'#00a0c7');
 if(board.game==='launch'){
  ctx.strokeStyle='#00bff2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...center(board.player));ctx.lineTo(...center([board.angle/3,3]));ctx.stroke();
 }
 if(board.game==='blocks'){
  const [x,y]=center(board.player),wide=board.rotated?9:26,tall=board.rotated?26:9;
  ctx.fillStyle='#00bff2';ctx.fillRect(x-wide/2,y-tall/2,wide,tall);
 }else{
  const [x,y]=center(board.player);
  dot(board.player,13,'#e8f8ff');
  ctx.fillStyle='#005baa';
  if(board.game==='invaders'||board.game==='launch'){
   ctx.beginPath();ctx.moveTo(x,y-10);ctx.lineTo(x+9,y+7);ctx.lineTo(x-9,y+7);ctx.closePath();ctx.fill();
  }else{
   ctx.beginPath();ctx.roundRect(x-8,y-8,16,16,5);ctx.fill();
   ctx.fillStyle='#9de8ff';ctx.fillRect(x-3,y-4,6,4);
  }
 }
}
function drawObstacles(board,ctx,dot){
 if(board.game!=='maze'&&!board.assist)for(const point of board.hazards||[])dot(point,9,'#f7941d');
 if(board.projectile)dot(board.projectile,5,'#00bff2');
 if(board.rival)dot(board.rival,10,'#ed1c24');
}
export function mountArcade(root,{gameRun,profile,api,onFinish,notify}){
 const canvas=root.querySelector('#arcade-canvas');
 if(!canvas||!gameRun.next)return ()=>{};
 canvas.width=logicalWidth;canvas.height=logicalHeight;
 const soft=profile.mode!=='Normal'||profile.motion;
 const {config}=gameRun;
 const newBoard=()=>arcadeBoard(config.game,gameRun.next.options.length,config.seed,gameRun.turn,config.level,config.assist);
 let board=newBoard(), inputs='', active=true, paused=false, waiting=false, held=null, clock=0;
 const abort=new AbortController(), {signal}=abort;
 const status=root.querySelector('#arcade-status'), score=root.querySelector('#arcade-score'), pause=root.querySelector('#arcade-pause');
 const describe=()=>{
  root.querySelector('#arcade-prompt').textContent=gameRun.next.prompt;
  root.querySelectorAll('[data-rune]').forEach((item,i)=>{item.hidden=i>=gameRun.next.options.length;item.querySelector('bdi').textContent=gameRun.next.options[i]||'';});
  root.querySelector('#arcade-checkpoint').textContent='Checkpoint '+(gameRun.position+1)+' / '+gameRun.total;
 };
 const draw=()=>{
  const cssWidth=canvas.getBoundingClientRect().width||logicalWidth;
  const pixels=Math.round(cssWidth*Math.min(3,window.devicePixelRatio||1));
  const pixelHeight=Math.max(1,Math.round(pixels*logicalHeight/logicalWidth));
  if(canvas.width!==pixels||canvas.height!==pixelHeight){
   canvas.width=pixels;canvas.height=pixelHeight;
  }
  canvas.getContext('2d').setTransform(pixels/logicalWidth,0,0,pixelHeight/logicalHeight,0,0);
  stage(board,canvas,soft);
  score.textContent=gameRun.score+board.score;
  canvas.setAttribute('aria-label',cabinets[config.game].title+' playfield. Player at column '+(board.player[0]+1)+', row '+(board.player[1]+1)+'.');
 };
 const setPause=value=>{
  paused=value;held=null;
  pause.textContent=value?'Resume':'Pause';
  status.textContent=value?'Paused.':'Game resumed.';
 };
 async function send(){
  waiting=true;held=null;
  try{
   const result=await api('arcade/move',{id:gameRun.id,turn:gameRun.turn,inputs});
   if(!active)return;
   Object.assign(gameRun,result);
   if(result.done){onFinish(result);return;}
   board=newBoard();inputs='';describe();draw();
   status.textContent=result.correct?(result.combo%3===0?'Combo bonus! Next checkpoint.':'Correct. Next checkpoint.'):'Try again. Choose another route.';
  }catch(error){
   if(!active)return;
   status.textContent=error.message;
   board=newBoard();inputs='';draw();
  }finally{waiting=false;}
 }
 function move(action){
  if(!active||paused||waiting||board.hit!==null)return;
  if(inputs.length>=2500){board=newBoard();inputs='';status.textContent='Checkpoint restarted.';}
  const bumps=board.bumps;
  arcadeStep(board,action);inputs+=action;
  draw();
  if(bumps!==board.bumps)status.textContent='Obstacle hit. Back at the checkpoint.';
  if(board.hit!==null)void send();
 }
 function frame(time){
  if(!active)return;
  if(!paused&&!waiting&&time-clock>=([210,160,125,95][config.level]+(soft?55:0))){
   clock=time;
   if(!config.assist||held||board.projectile||board.launch)move(held||'.');
  }
  request=requestAnimationFrame(frame);
 }
 root.querySelectorAll('[data-move]').forEach(control=>{
  const action=control.dataset.move;
  control.addEventListener('click',()=>move(action),{signal});
 });
 if(config.game==='ninja')canvas.addEventListener('pointerup',event=>{
  const rect=canvas.getBoundingClientRect();
  const x=Math.floor((event.clientX-rect.left)*width/rect.width),y=Math.floor((event.clientY-rect.top)*height/rect.height);
  const dx=x-board.player[0],dy=y-board.player[1];
  if(Math.abs(dx)+Math.abs(dy)>1)move(Math.abs(dx)>=Math.abs(dy)?(dx<0?'w':'e'):(dy<0?'n':'s'));
  else move('x');
 },{signal});
 pause.addEventListener('click',()=>setPause(!paused),{signal});
 document.addEventListener('keydown',event=>{
  if(!active||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,select,textarea'))return;
  if(event.key.toLowerCase()==='p'){event.preventDefault();if(!event.repeat)setPause(!paused);return;}
  const action=keyboard[event.key]||keyboard[event.key.toLowerCase()];
  if(!action||(action==='x'&&event.target.closest('button,a')))return;
  event.preventDefault();
  if(!event.repeat){held=action==='x'?null:action;move(action);}
 },{signal});
 document.addEventListener('keyup',event=>{if(held===(keyboard[event.key]||keyboard[event.key.toLowerCase()]))held=null;},{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)setPause(true);},{signal});
 window.addEventListener('blur',()=>{if(!paused)setPause(true);},{signal});
 const resize=new ResizeObserver(draw);
 resize.observe(canvas.parentElement);
 window.addEventListener('resize',draw,{signal});
 describe();draw();
 let request=requestAnimationFrame(frame);
 return ()=>{active=false;cancelAnimationFrame(request);abort.abort();resize.disconnect();};
}
