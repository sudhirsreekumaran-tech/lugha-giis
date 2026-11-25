import { tutorTopics,roleplayTopics,guidedReply } from './tutor-topics.mjs';
import { createPreview } from './ui-preview.mjs';
import { cabinets,difficulty } from './arcade-engine.mjs';
import { mountArcade } from './arcade-ui.mjs';
import { mountSmartArabic } from './smart-arabic.mjs';
import { worlds,games,ranks,cosmetics,alphabetLetters } from './content.mjs';
const $=selector=>document.querySelector(selector);
const main=$('#main'), dialog=$('#dialog');
const escape=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[x]);
const ar=value=>'<bdi class="ar" dir="rtl" lang="ar">'+escape(value)+'</bdi>';
const rich=value=>/\p{Script=Arabic}/u.test(value)?ar(value):escape(value);
const paths={
 home:'M3 10 12 3l9 7v10H3z M9 20v-6h6v6',map:'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',game:'M7 8h10c3 0 4 3 5 7s-2 5-4 3l-2-2H8l-2 2c-2 2-5 1-4-3s2-7 5-7z M7 11v4m-2-2h4m7 0h1m2 2h1',chat:'M3 4h18v13H9l-6 4z M8 10h8m-8 3h5',pen:'M4 16 16 4l4 4L8 20H4z M13 7l4 4',video:'M3 5h18v14H3z M10 9l5 3-5 3z',revision:'M4 11a8 8 0 1 1 3 7 M4 5v6h6',chart:'M4 20h16 M6 17v-4m6 4V8m6 9V4',gift:'M3 9h18v4H3z M5 13v8h14v-8 M12 9v12 M12 9C2 9 6 0 12 9c6-9 10 0 0 0z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8 M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',flame:'M12 22c-6 0-9-5-6-10 1 2 3 2 3 0-1-5 2-7 4-10-1 5 6 7 6 13 0 4-3 7-7 7z',gem:'M3 8l4-4h10l4 4-9 12z M3 8h18m-13 0 4 12 4-12',bolt:'M13 2 4 14h7l-1 8 10-12h-7z',target:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10 M12 11v2',lock:'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3',spark:'M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z',more:'M5 12h1m5 0h1m5 0h1',play:'m8 5 11 7-11 7z',help:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18 M9 9a3 3 0 1 1 4 3l-1 2m0 3h.01'
};
const icon=name=>'<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="'+(paths[name]||paths.spark)+'"/></svg></span>';
const nav=[['home','Home','home'],['adventure','Adventure','map'],['tutor','AI Tutor','chat'],['writing','Writing Lab','pen'],['videos','Videos & Games','video'],['revision','Revision','revision'],['progress','My Progress','chart'],['rewards','Rewards','gift'],['settings','Settings','settings'],['about','About','help']];
const btn=(title,action,cls='')=>'<button type="button" class="btn '+cls+'" data-action="'+escape(action)+'">'+title+'</button>';
const link=(title,route,cls='')=>'<a class="btn '+cls+'" href="#'+route+'">'+title+'</a>';
const opts=(values,value)=>values.map(x=>'<option '+(x===value?'selected':'')+'>'+escape(x)+'</option>').join('');
const intro=(title,desc)=>'<div class="section-intro"><h1>'+title+'</h1><p>'+desc+'</p></div>';
const progress=(value,label)=>'<div class="progress" role="progressbar" aria-label="'+escape(label)+'" aria-valuenow="'+Math.round(Math.min(100,Math.max(0,value)))+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+Math.max(0,Math.min(100,value))+'%"></i></div>';
const card=(symbol,title,desc,control='',color='lavender')=>'<article class="panel card"><div class="tile-icon '+color+'">'+symbol+'</div><h3>'+title+'</h3><p>'+desc+'</p>'+control+'</article>';
let state,lessons=[],route='home',args=[],round,study,toastTimer,playing,recognition,tracking=0, busy=false;
let parentChildren=[],parentChild='',signInRole='student',accountRequest=0;
let preview, earcons, gameRun, disposeArcade=()=>{}, branding={logo:false};
let tutor={topic:null,history:[],ai:false},video=null,writing={index:0,dictation:false},filters={},assignments=[];
let resetSmartArabic=()=>{};
async function api(path,data){
 if(preview)return preview.request(path,data);
 const res=await fetch('/api/'+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const payload=await res.json();
 if(!res.ok)throw Object.assign(Error(payload.error||'Please try again.'),{status:res.status});
 return payload;
}
function notify(text){
 const node=$('#toast');node.textContent=text;node.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),4800);
}
function apply(){
 const p=state.profile,b=document.body;
 b.dataset.mode=p.mode;b.dataset.theme=p.theme;b.dataset.motion=p.motion;b.dataset.reading=p.readingFont===true;b.dataset.simplified=p.simplified===true;
 b.style.setProperty('--ar',(p.arabic+(p.mode==='Dyslexia'?18:0))/100);
 b.style.setProperty('--en',(p.english+(p.mode==='Dyslexia'?12:0))/100);
 b.style.setProperty('--spacing',p.mode==='Dyslexia'?Math.max(1.85,p.spacing):p.spacing);
}
function chrome(){
 const links=(list)=>list.map(([id,title,symbol])=>'<a href="#'+id+'" class="nav-link '+(route===id?'active':'')+'" '+(route===id?'aria-current="page"':'')+'>'+icon(symbol)+escape(title)+'</a>').join('');
 $('#sidebar').innerHTML='<a href="#home" class="brand"><span class="logo" lang="ar">ل</span><span>LUGHA<small>A GIIS Student Innovation</small></span></a><div class="label nav-label">Explore</div><nav aria-label="Explore">'+links(nav.slice(0,6))+'</nav><div class="label nav-label">Your journey</div><nav aria-label="Your journey">'+links(nav.slice(6).concat(state.role==='parent'?[['parent','Family progress','chart']]:state.role==='teacher'?[['teacher','Classrooms','chart']]:state.role==='admin'?[['admin','Content Studio','pen']]:[]))+'</nav><div class="sidebar-bottom"><a class="mode-link" href="#settings">'+icon('help')+'Accessibility</a></div>';
 $('#mobile').innerHTML=links([nav[0],nav[1],nav.find(item=>item[0]==='videos'),nav[2],['more','More','more']]);
 $('#topbar').innerHTML='<div class="top-heading">'+schoolLogo('header-logo')+'<span class="crumb">'+escape(nav.find(x=>x[0]===route)?.[1]||({world:'Adventure',lesson:'Adventure',activity:'Practice',materials:'Study Materials',teacher:'Classrooms',admin:'Content Studio',more:'Explore'})[route]||'LUGHA')+'</span></div><div class="top-stats"><a href="#progress" class="chip" aria-label="'+state.streak+' day streak"><span class="fire">'+icon('flame')+'</span>'+state.streak+'</a><a href="#rewards" class="chip" aria-label="'+state.gems+' gems"><span class="gem">'+icon('gem')+'</span>'+state.gems+'</a><a href="#progress" class="chip"><span class="xp">'+icon('bolt')+'</span>'+state.xp+' XP</a><button class="avatar" data-action="'+(state.guest?'account':'profile')+'" aria-label="Account">'+escape(cosmetics[state.profile.equipped]?.[2]||state.profile.avatar)+'</button></div>';
}
function unlocked(world){return Boolean(preview)||world===0||state.bosses.includes(world-1);}
function recommended(){
 const next=lessons.find(x=>unlocked(x.world)&&!state.completed.includes(x.id));
 if(next)return next;
 return lessons.find(x=>x.id===state.study[0]?.lesson)||lessons[0];
}
function worldRow(world,index){
 const status=state.bosses.includes(index)?'Completed':unlocked(index)?'Available':'Locked';
 return '<a class="world" href="#world/'+index+'"><span class="tile-icon '+world[3]+'" aria-hidden="true">'+world[1]+'</span><span class="fill"><span class="world-title">'+world[0]+'</span><br><span class="meta">'+world[2]+'</span></span><span class="world-status '+(status==='Locked'?'locked':'')+'">'+status+'</span></a>';
}
function levelPanel(){
 const pct=state.next?100*(state.xp-state.base)/(state.next-state.base):100;
 return '<section class="panel"><div class="heading"><h3>Your level</h3>'+icon('bolt')+'</div><div class="level-content"><div class="ring" style="--pct:'+pct+'%" aria-label="Level '+(state.level+1)+'"><span>Lv '+(state.level+1)+'</span></div><div class="fill"><strong>'+ranks[state.level]+'</strong>'+progress(pct,'XP to next level')+'<div class="meta">'+state.xp+' XP '+(state.next?'· '+(state.next-state.xp)+' to next level':'· Max level')+'</div></div></div></section>';
}
function missionDeck(){
 const [spotlight,featured]=Object.entries(cabinets)[Math.floor(Date.now()/86400000)%Object.keys(cabinets).length];
 const {title:name,description:desc,icon:symbol}=featured;
 return '<section class="mission-deck" aria-labelledby="play-today"><div class="heading"><h2 id="play-today">Pick a side quest</h2><a href="#videos/games">All games</a></div><div class="side-missions">'+
 '<a class="side-mission mint" href="#arcade/'+spotlight+'"><span class="side-symbol" aria-hidden="true">'+symbol+'</span><strong>'+name+'</strong><span>'+desc+'</span></a>'+
 '<a class="side-mission blue" href="#revision"><span class="side-symbol" aria-hidden="true">↻</span><strong>Rematch</strong><span>Take on words you’ve met before.</span></a>'+
 '<a class="side-mission yellow" href="#rewards"><span class="side-symbol" aria-hidden="true">◇</span><strong>Treasure chest</strong><span>Equip a reward with earned gems.</span></a></div></section>';
}
function schoolLogo(cls=''){
 return branding.logo?'<img src="/giis-logo.png" class="giis-logo '+cls+'" alt="Global Indian International School">':'';
}
function about(){
 return intro('About LUGHA','Play. Learn. Connect.')+'<section class="panel">'+schoolLogo()+'<h2>A GIIS Student Innovation</h2><p>LUGHA is an Arabic learning and arcade project developed as a student innovation. Its challenges draw inspiration from GIIS’s holistic approach to education.</p><a class="btn outline" href="https://globalindianschool.org/the-gsf-difference/9gems/" target="_blank" rel="noopener noreferrer">GIIS 9GEMS framework</a></section>';
}
function records(){
 return '<section class="panel"><div class="heading"><h3>Arcade personal bests</h3><a href="#videos/games">LUGHA Arcade</a></div>'+((state.arcadeBests||[]).map(row=>'<p>'+escape(cabinets[row.game]?.title||row.game)+' · '+row.score+' points · '+row.accuracy+'% accuracy</p>').join('')||'<p>Finish an arcade run to set your first record.</p>')+'</section>';
}
function arcadePage(){
 const name=args[0], game=Object.hasOwn(cabinets,name)&&cabinets[name];
 if(!game)return intro('Game unavailable','Choose a cabinet in LUGHA Arcade.')+link('LUGHA Arcade','videos/games');
 if(gameRun?.config.game!==name||!gameRun?.next){
  const best=state.arcadeBests?.find(x=>x.game===name);
  const proficiency=['Complete Beginner','Beginner','Intermediate','Advanced'].indexOf(state.profile.level);
  const suggested=difficulty[state.profile.mode==='Normal'?Math.min(3,Math.max(proficiency,best?.accuracy>=85?2:1)):0];
  return '<section class="panel arcade-frame">'+link('LUGHA Arcade','videos/games','outline small')+'<div class="arcade-cover" style="border-radius:14px;margin-top:10px"><h1>'+game.title+'</h1><p>'+game.description+'</p></div><p>'+game.instructions+'</p><p>Use arrow keys, WASD, or touch controls. Press P to pause. '+(best?'Personal best: '+best.score+' points.':'')+'</p><form id="arcade-start"><label>Difficulty<select name="difficulty">'+opts(difficulty,suggested)+'</select></label><label>Question world<select name="world"><option value="">Mixed practice</option>'+worlds.map((world,i)=>'<option value="'+i+'" '+(args[1]===String(i)?'selected':'')+'>'+world[0]+'</option>').join('')+'</select></label><label class="check"><input type="checkbox" name="assist" '+(state.profile.mode!=='Normal'||state.profile.schoolAssist?'checked':'')+'> Untimed assist · remove hazards and move one step at a time</label><button class="btn">Start game</button></form></section>';
 }
 if(gameRun.done)return '<section class="panel arcade-frame celebrate"><h1>Mission complete</h1><p>'+game.title+' · '+gameRun.score+' points · '+gameRun.accuracy+'% accuracy</p><p>Personal best: '+gameRun.best.score+' points'+(gameRun.earned?' · +50 XP · +5 gems':'')+'</p><div class="row">'+btn('Play again','arcadereset')+link('LUGHA Arcade','videos/games','outline')+(gameRun.lesson?link(gameRun.accuracy<80?'Review lesson':'Continue lesson','lesson/'+gameRun.lesson,'subtle'):'')+'</div></section>';
 return '<section class="panel arcade-frame"><div class="heading"><h2>'+game.title+'</h2><div class="arcade-score"><span id="arcade-score">0</span> pts</div></div><div id="arcade-checkpoint" class="meta"></div><div class="arcade-prompt" id="arcade-prompt"></div><ul class="arcade-runes" aria-label="Answer choices">'+[...'ABCD'].map(letter=>'<li data-rune hidden><span class="rarity">'+letter+'</span><bdi lang="ar" dir="rtl"></bdi></li>').join('')+'</ul><div class="cabinet-scene"><canvas id="arcade-canvas">Use the directional buttons below to move.</canvas></div><div class="pad" aria-label="Game controls">'+[['w','◀','Move left'],['n','▲','Move up'],['s','▼','Move down'],['e','▶','Move right']].map(([key,label,desc])=>'<button type="button" data-move="'+key+'" aria-label="'+desc+'" class="btn subtle">'+label+'</button>').join('')+(game.action?'<button type="button" class="btn subtle" data-move="x">'+game.action+'</button>':'')+'<button type="button" class="btn outline" id="arcade-pause">Pause</button>'+btn('Restart','arcadereset','outline')+'</div><p id="arcade-status" class="arcade-status" role="status"></p></section>';
}
function report(){
 const certificate=args[0]==='certificate';
 return '<section class="panel print-sheet">'+schoolLogo()+'<p>A GIIS Student Innovation</p><h1>'+(certificate?'LUGHA achievement certificate':'LUGHA student progress report')+'</h1><p>'+escape(state.profile.name)+'</p>'+(certificate?'<ul>'+state.achievements.filter(x=>x[2]).map(x=>'<li>'+escape(x[0])+'</li>').join('')+'</ul>':'<p>'+state.completed.length+' lessons completed · '+state.xp+' XP · '+state.bosses.length+' worlds cleared</p>'+records())+btn('Print','print','outline')+'</section>';
}
function gameGrid(){
 return '<section id="arcade-catalogue" aria-labelledby="arcade-heading" style="margin-top:24px"><div class="arcade-cover panel"><h2 id="arcade-heading" tabindex="-1">LUGHA Arcade</h2><p>Play. Learn. Connect.</p></div><div class="arcade-grid">'+Object.entries(cabinets).map(([id,game])=>'<article class="arcade-card panel"><div class="arcade-art '+game.colour+'"><span aria-hidden="true">'+game.icon+'</span></div><div class="arcade-info"><h3>'+game.title+'</h3><p>'+game.description+'</p>'+link('Play','arcade/'+id)+'</div></article>').join('')+'</div><h2 style="margin:20px 0 12px">Practice games</h2><div class="arcade-grid">'+games.map(([title,desc,symbol],i)=>
 '<article class="arcade-card panel"><div class="arcade-art '+worlds[i%8][3]+'"><span aria-hidden="true">'+symbol+'</span></div><div class="arcade-info"><h3>'+title+'</h3><p>'+desc+'</p>'+link(i===11?'Choose a world':'Play','game/'+i,'subtle small')+'</div></article>'
 ).join('')+'</div></section>';
}
function home(){
 const next=recommended();
 const start=state.completed.length||state.study.length?'Continue learning':'Start learning';
 return '<div class="welcome"><div><div class="label">Your learning dashboard</div><h1>Marhaban, '+escape(state.profile.name)+'! <span aria-hidden="true">✦</span></h1><p>Choose your next mission and explore with Noor.</p></div>'+link(icon('settings')+' Accessibility','settings','outline small')+'</div><div class="dashboard"><div class="stack"><section class="hero" aria-label="Noor the desert fox welcomes you"><div class="hero-content"><span class="eyebrow">Your next lesson</span><h2>'+escape(worlds[next.world][0])+'</h2><p>'+escape(next.title)+' with Noor.</p>'+link(icon('play')+' '+start,'lesson/'+next.id)+'</div></section><section class="panel"><div class="heading"><h2>The World of LUGHA</h2><a href="#adventure">View map</a></div><div class="world-list">'+worlds.slice(0,3).map(worldRow).join('')+'</div></section>'+missionDeck()+'<section class="panel"><h3>School values challenge</h3><p>Explore Emirati heritage while crossing the map.</p>'+link('Play Cultural Explorer','arcade/cross/6','subtle small')+'</section></div><div class="stack">'+levelPanel()+'<section class="panel quest"><div class="quest-title"><div class="tile-icon">'+icon('target')+'</div><div><h3>Daily quest</h3><div class="meta">100 XP · 10 gems</div></div></div><p>'+ (state.daily?'Quest complete!':'Complete 2 lessons today.')+'</p>'+progress(state.dailyCount*50,'Daily quest')+'<span class="meta">'+Math.min(state.dailyCount,2)+' / 2 lessons</span>'+link(state.daily?'View progress':'Continue quest',state.daily?'progress':'lesson/'+next.id,'subtle wide small')+'</section><section class="panel"><div class="heading"><h3>Quick practice</h3></div>'+[['games','Word Match','Learn through play','game','mint'],['tutor','Practise with Layla','Arabic conversation','chat','pink'],['writing','Writing Lab','Build handwriting skills','pen','blue']].map(([dest,title,detail,symbol,color])=>'<a class="quick" href="#'+(dest==='games'?'game/0':dest)+'"><span class="tile-icon '+color+'">'+icon(symbol)+'</span><span><strong>'+title+'</strong><span class="meta">'+detail+'</span></span></a>').join('')+'</section>'+records()+'</div></div>';
}
function worldPage(){
 const index=Number(args[0]), world=worlds[index];
 if(!world)return intro('World unavailable','Choose a world from the map.');
 const list=lessons.filter(x=>x.world===index),open=unlocked(index);
 const done=list.filter(x=>state.completed.includes(x.id)).length;
 return '<div class="row keypad">'+link('Arcade mission','arcade/maze/'+index,'subtle')+'</div><div class="panel hero-mini '+world[3]+'"><div class="tile-icon">'+world[1]+'</div><div><h1>'+world[0]+'</h1><p>'+world[2]+'</p></div></div><p>'+ (open?done+' of '+list.length+' lessons completed':'Clear '+worlds[index-1][0]+' to unlock this world.')+'</p><div class="grid">'+list.map((lesson,i)=>card('✦',escape(lesson.title),lesson.items.length+' learning items · '+(state.completed.includes(lesson.id)?'Completed':'Knowledge check'),open?link(state.completed.includes(lesson.id)?'Review lesson':'Open lesson','lesson/'+lesson.id,'subtle'):'',world[3])).join('')+card('♜','World challenge',state.bosses.includes(index)?'Completed · replay for practice':'Finish the lessons to open the challenge.',open&&done===list.length?btn('Start boss battle','start:boss:'+index):'','yellow')+'</div>';
}
function lessonPage(){
 const lesson=lessons.find(x=>x.id===args[0]);
 if(!lesson||!unlocked(lesson.world))return intro('Lesson locked','Complete the previous world challenge to continue.')+link('Open adventure map','adventure');
 if(study?.id!==lesson.id)study={id:lesson.id,cursor:0,meaning:state.profile.mode!=='Dyslexia',example:state.profile.mode!=='Dyslexia'};
 const item=lesson.items[study.cursor];

 return '<section class="panel activity">'+link('Back to '+worlds[lesson.world][0],'world/'+lesson.world,'outline small')+'<p class="meta">Study card '+(study.cursor+1)+' of '+lesson.items.length+'</p><h2>'+escape(lesson.title)+'</h2>'+progress((study.cursor+1)*100/lesson.items.length,'Study cards')+'<div class="study-word"><bdi class="ar big" lang="ar" dir="rtl">'+escape(item.ar)+'</bdi></div><div class="row">'+soundButtons(item.ar)+btn(study.meaning?'Hide meaning':'Show meaning','meaning','subtle small')+btn(study.example?'Hide transliteration':'Show transliteration','example','outline small')+'</div>'+(study.meaning?'<p class="meaning"><strong>Meaning</strong> · '+escape(item.en)+'</p>':'')+(study.example?'<p class="phonetic"><strong>Transliteration</strong> · '+escape(item.say)+'</p>':'')+'<div class="row">'+(study.cursor?btn('Previous','study:-1','outline'):'')+(study.cursor<lesson.items.length-1?btn('Next','study:1','subtle'):'')+link('Watch lesson','videos/'+lesson.id,'subtle')+link('Play related game',gameForLesson(lesson),'outline')+btn('Practise','start:lesson:'+lesson.id)+'</div></section>';
}
function soundButtons(value){
 return btn('Listen','speak:'+encodeURIComponent(value),'outline small')+btn('Pause or resume','pause','outline small')+btn('Replay','speak:'+encodeURIComponent(value),'outline small');
}
function gamePage(){
 const index=Number(args[0]),g=games[index];
 if(!g||index===11)return intro('Boss Battle','Complete a world’s lessons before taking its boss challenge.')+link('View adventure map','adventure');
 return '<section class="panel activity">'+link('Back to games','videos/games','outline small')+'<p class="tile-icon art-chip">'+g[2]+'</p><h2>'+g[0]+'</h2><p>'+g[1]+'</p><form id="game-form"><label>Difficulty<select name="difficulty">'+opts(['Gentle','Standard','Challenge'],state.profile.mode==='Normal'?'Standard':'Gentle')+'</select></label>'+(index===4?'<label>Format<select name="format">'+opts(['Audio','Text'],'Audio')+'</select></label>':'')+'<button class="btn">Play</button></form></section>';
}
async function start(kind,target,difficulty,visual=false){
 const active=await api('attempt',{kind,target:String(target),difficulty:difficulty||(state.profile.mode==='Normal'?'Standard':'Gentle'),visual});
 round={...active,kind,target,difficulty,visual,combo:0,bestCombo:0,order:[],pairs:[],selected:[],feedback:'',correct:false,score:null};
 if(route==='activity')render();else location.hash='activity';
 if(state.profile.audioInstructions) setTimeout(()=>{if(route==='activity'&&round?.id===active.id)speak(active.next.type==='trace'?'Trace the letters or use the keyboard.':'Choose or build your answer. You can try again.','en',true);},250);
}
function checkpointTrail(r){
 return '<ol class="checkpoint-trail" aria-label="Round checkpoints">'+Array.from({length:r.total},(_,i)=>{
  const status=i<r.position?'cleared':i===r.position?'current':'ahead';
  return '<li class="'+status+'" '+(status==='current'?'aria-current="step"':'')+' aria-label="Checkpoint '+(i+1)+', '+status+'">'+(status==='cleared'?'✓':i+1)+'</li>';
 }).join('')+'</ol>';
}
function victory(r){
 if(r.kind==='writing'||r.next.type==='trace')return '';
 const stars=r.score===100?3:r.score>=75?2:1;
 return '<div class="victory-stars" aria-label="'+stars+' out of 3 stars"><span aria-hidden="true">'+'★'.repeat(stars)+'☆'.repeat(3-stars)+'</span></div>'+(r.bestCombo>=2?'<p class="combo-badge">Best combo ×'+r.bestCombo+'</p>':'');
}
function activityPage(){
 if(!round)return intro('Choose a practice activity','Open a lesson or pick a mini-game.')+link('Explore the mini-games','videos/games');
 const r=round,q=r.next;
 const title=({lesson:lessons.find(x=>x.id===r.target)?.title,game:games[r.target]?.[0],boss:'World challenge',revision:'Revision mission',writing:'Writing check',video:'Video knowledge check',placement:'Placement quiz'})[r.kind];
 if(r.recommendation)return '<section class="panel activity"><h2>Suggested starting level</h2><p>'+escape(r.recommendation)+' · '+r.score+'% score</p><p>Choose this level to personalise Layla and save it in your profile. Adventure worlds still unlock through practice.</p><div class="row">'+btn('Use suggested level','placementlevel')+link('Return to Settings','settings','outline')+'</div></section>';
 if(r.score!==null)return '<section class="panel activity celebrate"><div class="tile-icon art-chip">🦊</div>'+victory(r)+'<h2>Great work, '+escape(state.profile.name)+'!</h2><p>'+escape(title)+(q.type==='trace'?' · self-assessment saved':' complete · '+r.score+'% score')+'</p><p>'+ (r.earned?'Your progress and rewards are saved.':'Your earlier completion rewards are already saved.')+'</p><div class="row">'+link('Continue learning',r.kind==='boss'?'adventure':r.kind==='lesson'?'world/'+lessons.find(x=>x.id===r.target).world:'home')+btn('Replay','replay','outline')+link('View progress','progress','outline')+'</div></section>';
 let controls='';
 const options=q.options||[];
 if(q.type==='order'){
  controls='<div class="answer-box" aria-label="Your answer">'+ar(r.order.map(i=>options[i]).join(q.join))+'</div><div class="row keypad">'+options.map((x,i)=>btn(ar(x),'order:'+i,'outline'+(r.order.includes(i)?' used':''))).join('')+'</div><div class="row">'+btn('Undo','undoorder','outline')+btn('Check answer','checkorder')+'</div>';
 }else if(q.type==='memory'){
  const used=r.pairs.flat();
  controls='<p>Turn over two cards at a time. Submit your pairs when all cards are placed.</p><div class="options">'+options.map((x,i)=>'<button class="btn option" data-action="memory:'+i+'" aria-label="'+escape(used.includes(i)||r.selected.includes(i)?x:'Card '+(i+1))+'" '+(used.includes(i)||r.selected.includes(i)?'disabled':'')+'>'+(used.includes(i)||r.selected.includes(i)?rich(x):'Card '+(i+1))+'</button>').join('')+'</div>'+r.pairs.map(pair=>'<span class="chip">'+pair.map(i=>rich(options[i])).join(' / ')+'</span>').join(' ')+'<div class="row">'+btn('Reset cards','resetmemory','outline')+(used.length===options.length?btn('Check pairs','checkmemory'):'')+'</div>';
 }else if(q.type==='trace'){
  controls=canvas(q.prompt)+'<p>Compare your writing with the guide, then confirm your self-assessment.</p>'+btn('I reviewed my work','trace-answer');
 }else{
  controls=(q.audio?soundButtons(q.audio)+btn('Start text version','visualgame','subtle small'):'')+'<div class="options">'+options.map((x,i)=>btn(rich(x),'answer:'+i,'option '+(r.kind==='game'&&Number(r.target)===2?'balloon':''))).join('')+'</div>';
 }
 const dash=Number(r.target)===6||Number(r.target)===7;
 return '<section class="panel activity"><p class="label">'+escape(title)+'</p><h2>Question '+(r.position+1)+' of '+r.total+'</h2>'+checkpointTrail(r)+(r.combo>=2?'<div class="combo-badge">Combo ×'+r.combo+'</div>':'')+(r.kind==='game'&&dash?'<div class="progress-track" aria-hidden="true"><span style="left:'+r.position*90/r.total+'%">'+(Number(r.target)===6?'🦊':'💎')+'</span></div>':'')+'<p>'+ (q.ar?rich(q.prompt):escape(q.prompt))+'</p>'+controls+(r.feedback?'<div class="feedback '+(r.correct?'good':'')+'" role="status">'+escape(r.feedback)+'</div>':'')+'</section>';
}
function canvas(value){
 return '<div class="canvas-wrap"><div class="trace-guide" lang="ar" dir="rtl" aria-hidden="true">'+escape(value)+'</div><canvas id="canvas" width="800" height="265" aria-label="Freehand writing area. Use the text alternative if you prefer."></canvas></div><div class="row keypad">'+btn('Undo stroke','undo-stroke','outline small')+btn('Clear canvas','clear-stroke','outline small')+'</div><label>Keyboard alternative<input id="typed-ar" lang="ar" dir="rtl" autocomplete="off"></label>';
}
let strokes=[];
function mountCanvas(){
 const c=$('#canvas');
 if(!c)return;
 strokes=[];
 const ctx=c.getContext('2d');
 const point=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height];};
 c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);strokes.push([point(e)]);paint();});
 c.addEventListener('pointermove',e=>{if(c.hasPointerCapture(e.pointerId)&&strokes.length){strokes.at(-1).push(point(e));paint();}});
 function paint(){
  ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='#593e99';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
  for(const points of strokes){
   ctx.beginPath();ctx.moveTo(...points[0]);
   if(points.length===1){ctx.arc(...points[0],2.5,0,Math.PI*2);ctx.fill();}
   else{for(const p of points.slice(1))ctx.lineTo(...p);ctx.stroke();}
  }
 }
 c.paint=paint;
}
function writingPage(){
 const list=lessons.flatMap(x=>x.items),item=list[writing.index]||list[0];
 return intro('Writing Lab','Trace a letter, write a word or try dictation. Compare your work with the guide to check it yourself.')+'<div class="panel activity"><div class="row">'+btn('Tracing','writingmode:trace',writing.dictation?'outline':'subtle')+btn('Dictation','writingmode:dictation',writing.dictation?'subtle':'outline')+btn('Previous exercise','writingprev','outline')+btn('Next exercise','writingnext','outline')+'</div><p>Exercise '+(writing.index+1)+' of '+list.length+'</p>'+(writing.dictation?soundButtons(item.ar)+btn('Reveal guide','reveal-writing','subtle small'):'<p>'+ar(item.ar)+' · '+escape(item.en)+'</p>')+canvas(writing.dictation&&!writing.reveal?'':item.ar)+'<div class="row keypad" aria-label="Arabic keyboard">'+alphabetLetters.map(x=>btn(ar(x),'key:'+encodeURIComponent(x),'outline small')).join('')+btn('Space','key:%20','outline small')+'</div>'+btn('Save self-assessment','save-writing:'+item.id)+'</div>';
}
const lessonGame = lesson=>['maze','dash','snake','blocks','ninja','quest','cross','invaders'][lesson.world]||'maze';
const gameForLesson = lesson=>'arcade/'+lessonGame(lesson)+'/'+lesson.world+'/'+lesson.id;
const assignmentRoute = value=>/^(arcade|videos)\//.test(value)?escape(value):'lesson/'+escape(value);
function videosPage(){
 if(!args[0]||args[0]==='games')return intro('Videos & Games','Watch narrated lessons at your own pace, then practise in the Arcade.')+'<div class="row keypad">'+link('Jump to games','videos/games','outline small')+'</div><div class="grid">'+worlds.map((world,i)=>{const lesson=lessons.find(x=>x.world===i);return card(icon('video'),world[0],escape(lesson.title)+' · '+(lesson.items.length*6)+' seconds',link('Watch lesson','videos/'+lesson.id,'subtle'),world[3]);}).join('')+'</div>'+gameGrid();
 const lesson=lessons.find(x=>x.id===args[0]);
 if(!lesson)return intro('Video unavailable','Choose another video lesson.');
 if(video?.id!==lesson.id){
  const saved=state.viewing?.find(x=>x.lesson===lesson.id);
  const start=saved?Math.min(saved.slide,lesson.items.length-1):0;
  video={id:lesson.id,index:start,visited:new Set(saved?JSON.parse(saved.visited):[0]),running:false};
  saveVideoSlide(video.id,start);
 }
 const item=lesson.items[video.index];
 return '<section class="panel activity lesson-journey">'+link('All video lessons','videos','outline small')+'<p class="label">Watch · Play · Review</p>'+'<p class="meta">Slide '+(video.index+1)+' of '+lesson.items.length+'</p><h2>'+escape(lesson.title)+'</h2><div class="video-stage"><bdi class="ar big" dir="rtl" lang="ar">'+escape(item.ar)+'</bdi><strong>'+escape(item.en)+'</strong><span>'+escape(item.say)+'</span></div><div class="row keypad">'+btn(video.running?'Pause slides':video.ended?'Replay slides':'Play slides','video-play','subtle')+btn('Previous slide','video-prev','outline')+btn('Next slide','video-next','outline')+soundButtons(item.ar)+'</div><div class="row"><label>Video pace<select id="video-pace">'+[.5,.75,1,1.25,1.5].map(rate=>'<option value="'+rate+'" '+(rate===(video.speed??state.profile.videoSpeed??1)?'selected':'')+'>'+rate+'×</option>').join('')+'</select></label></div><details><summary>Read the transcript</summary><ol>'+lesson.items.map(x=>'<li>'+ar(x.ar)+' · '+escape(x.en)+'</li>').join('')+'</ol></details><p>Captions stay on screen. You can read through each slide at your own pace.</p>'+(video.visited.size===lesson.items.length?'<div class="row">'+link('Play Game',gameForLesson(lesson),'video-game-ready')+(!preview?btn('Record video knowledge check','start:video:'+lesson.id,'outline'):'')+'</div>':'')+'</section>';
}
function revision(){
 const words=lessons.flatMap(x=>x.items);
 const due=state.mastery.filter(x=>x.due<=Date.now()).sort((a,b)=>b.misses-a.misses);
 return intro('Revision','Revisit difficult words and practise at your own pace.')+'<div class="grid two">'+card('↻','Daily revision mission',due.length+' items due for review. '+(state.mastery.length?'Your practice history guides the mission.':'Study a lesson to personalise future reviews.'),btn('Start revision','start:revision:today'))+card('▤','My Study Materials',state.study.length+' lessons in your learning history.',link('Open materials','materials','subtle'),'mint')+'</div><div class="panel" style="margin-top:16px"><h2>Words to revisit</h2>'+(due.length?due.slice(0,12).map(x=>{const word=words.find(w=>w.id===x.word);return word?'<p>'+ar(word.ar)+' · '+escape(word.en)+'</p>':'';}).join(''):'<p>No words due for review yet.</p>')+'</div>';
}
function progressPage(){
 const stats=[['⚡','Total XP',state.xp],['◇','Gems earned',state.activity.reduce((a,b)=>a+Math.max(0,b.gems),0)],['🔥','Current streak',state.streak+(state.streak===1?' day':' days')],['✦','Longest streak',state.longest+(state.longest===1?' day':' days')],['▤','Lessons completed',state.completed.length],['✓','Words mastered',state.mastery.filter(x=>x.hits>=3).length],['✎','Writing exercises',state.activity.filter(x=>x.kind==='writing').length],['▶','Video checks',state.activity.filter(x=>x.kind==='video').length],['♜','Worlds completed',state.bosses.length]];
 const days=Array.from({length:7},(_,i)=>new Date(Date.now()-(6-i)*86400000));
 return intro('My Progress','See what you’ve learned and find your next practice activity.')+records()+((state.journeys||[]).length?'<section class="panel"><h3>Lesson Arcade results</h3>'+state.journeys.map(x=>'<p>'+escape(lessons.find(l=>l.id===x.lesson)?.title||'Lesson')+' · '+x.score+' points · '+x.accuracy+'% accuracy</p>').join('')+'</section>':'')+'<div class="row keypad">'+link('Progress report','report','outline small')+(state.achievements.some(x=>x[2])?link('Achievement certificate','report/certificate','outline small'):'')+'</div>'+'<div class="grid">'+stats.map(([s,t,n])=>card(s,t,n)).join('')+'</div><div class="grid two" style="margin-top:15px">'+levelPanel()+'<section class="panel"><h3>Last 7 days</h3><p>'+state.completed.length+' of '+lessons.length+' lessons completed</p>'+progress(state.completed.length*100/lessons.length,'Curriculum progress')+'<div class="week">'+days.map(day=>'<span class="day '+(state.days.includes(day.toISOString().slice(0,10))?'done':'')+'" title="'+day.toISOString().slice(0,10)+'">'+day.toLocaleDateString('en',{weekday:'short',timeZone:'UTC'})+'</span>').join('')+'</div></section></div><section class="panel" style="margin-top:15px"><h3>Weekly quest</h3><p>Complete five lessons this week · '+Math.min(state.weeklyCount,5)+' / 5</p>'+progress(state.weeklyCount*20,'Weekly quest')+'</section><div class="panel" style="margin-top:15px"><div class="heading"><h2>Recent activity</h2><a href="#materials">My Study Materials</a></div>'+(state.activity.filter(x=>x.kind!=='answer').slice(0,12).map(x=>'<p>'+escape(lessons.find(l=>l.id===x.target)?.title||(['game','boss'].includes(x.kind)?(x.kind==='game'?games[x.target]?.[0]:worlds[x.target]?.[0]):null)||x.kind)+' · '+x.at.slice(0,10)+(x.score===null?'':' · '+x.score+'%')+'</p>').join('')||'<p>Your completed activities will appear here.</p>')+link('Review difficult words','revision','subtle small')+'</div><section class="panel" style="margin-top:15px"><h3>Classroom leaderboards</h3><div id="class-rankings"><p>Loading classroom rankings…</p></div></section>';
}
function materials(){
 const list=state.study.map(x=>({...x,entry:lessons.find(l=>l.id===x.lesson)})).filter(x=>x.entry).filter(x=>(!filters.world||String(x.entry.world)===filters.world)&&(!filters.status||(state.completed.includes(x.lesson)?'Completed':'In progress')===filters.status));
 return intro('My Study Materials','Reopen any lesson you’ve studied.')+'<form id="filters" class="panel row"><label>Category<select name="world"><option value="">All worlds</option>'+worlds.map((x,i)=>'<option value="'+i+'" '+(filters.world===String(i)?'selected':'')+'>'+x[0]+'</option>').join('')+'</select></label><label>Status<select name="status"><option value="">Any status</option>'+opts(['Completed','In progress'],filters.status)+'</select></label><button class="btn subtle">Apply filters</button></form><div class="grid" style="margin-top:15px">'+(list.map(({entry,at,lesson})=>card('▤',escape(entry.title),worlds[entry.world][0]+' · '+(state.completed.includes(lesson)?'Completed':'In progress')+' · '+at.slice(0,10),link('Reopen lesson','lesson/'+lesson,'subtle small'))).join('')||'<p>No lessons match these filters.</p>')+'</div>';
}
function rewards(){
 return intro('Rewards','Spend earned LUGHA Gems on your favourite cosmetics. Balance '+state.gems+' gems.')+'<div class="grid">'+cosmetics.map(([title,cost,symbol],i)=>card(symbol,title,state.profile.equipped===i?'Equipped':state.inventory.includes(i)?'Owned':cost+' gems',state.profile.equipped===i?'':btn(state.inventory.includes(i)?'Equip':'Unlock and equip','shop:'+i,'subtle small'))).join('')+'</div><h2 style="margin:21px 0 12px">Achievements</h2><div class="grid">'+state.achievements.map(([title,description,done])=>card('<span class="badge '+(done?'celebrate':'disabled-badge')+'">'+(done?'🏅':'☆')+'</span>',title,description+' · '+(done?'Earned':'Locked'))).join('')+'</div>';
}
function parentPage(){
 if(state.role!=='parent')return intro('Family progress','Sign in with an authorised parent account.')+btn('School sign-in','account');
 const children=parentChildren;
 const child=children.find(x=>x.id===parentChild)||children[0];
 return schoolLogo()+intro('Family progress','View learning progress for students linked to your account.')+'<section class="panel" id="family-content">'+(!child?'<p>No linked students are available.</p>':'<label>Student<select id="parent-child">'+children.map(x=>'<option value="'+escape(x.id)+'" '+(x.id===child.id?'selected':'')+'>'+escape(x.name)+'</option>').join('')+'</select></label><h2 style="margin-top:18px">'+escape(child.name)+'</h2><p>'+escape(child.grade||'')+'</p><div class="grid">'+card('▤','Lessons',child.lessons)+card('▶','Video checks',child.videos)+card('✦','XP',child.xp)+'</div><h3 style="margin-top:16px">Arcade records</h3>'+(child.games.map(x=>'<p>'+escape(cabinets[x.game]?.title||x.game)+' · '+x.score+' points · '+x.accuracy+'% accuracy</p>').join('')||'<p>No completed Arcade rounds yet.</p>')+'<h3>Curriculum progress</h3><p>'+child.lessons+' of '+child.total+' lessons completed</p>'+progress(child.total?100*child.lessons/child.total:0,'Curriculum progress')+'<h3>Recent learning</h3>'+(child.recent.map(entry=>'<p>'+escape(lessons.find(x=>x.id===entry.target)?.title||cabinets[entry.target]?.title||entry.kind)+' · '+escape(entry.at.slice(0,10))+'</p>').join('')||'<p>No activity yet.</p>')+'<h3>Next step</h3><p>'+escape(child.recommendation)+'</p>')+'</section>';
}
function preferenceForm(onboarding=false){
 const p=state.profile;
 const select=(title,name,values)=>'<label>'+title+'<select name="'+name+'">'+opts(values,String(p[name]))+'</select></label>';
 const number=(title,name,min,max,step)=>'<label>'+title+'<input type="number" name="'+name+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+(p[name]??1)+'"></label>';
 const check=(title,name)=>'<label class="check"><input type="checkbox" name="'+name+'" '+(p[name]?'checked':'')+'>'+title+'</label>';
 return '<form id="preferences"><label>Display name<input name="name" maxlength="32" required value="'+escape(p.name)+'"></label><div class="grid two">'+select('Arabic proficiency','level',['Complete Beginner','Beginner','Intermediate','Advanced'])+select('Daily target (minutes)','minutes',['5','10','15','20'])+(onboarding?'':select('Reading layout','mode',['Normal','Special','Dyslexia']))+select('Colour theme','theme',['Light','Dark','Cream','High contrast'])+select('Avatar','avatar',['🦊','🌟','🌙','🐪','🌵'])+'</div><label>Learning goal<input name="goal" maxlength="80" value="'+escape(p.goal)+'"></label>'+(!onboarding?'<h3>Accessibility</h3><div class="grid two">'+number('English text size (%)','english',85,145,1)+number('Arabic text size (%)','arabic',85,175,1)+number('Line spacing','spacing',1.3,2.3,.05)+number('Speech speed','speed',.5,1.25,.05)+number('Video pace','videoSpeed',.5,1.5,.25)+'</div>'+check('Reduce motion','motion')+check('Use a clearer reading font','readingFont')+check('Simplify navigation and reduce visual clutter','simplified')+check('Speak activity instructions when possible','audioInstructions')+check('Play answer sounds','sound')+check('Share an anonymous alias and XP in enabled classrooms','leaderboard'):'')+'<button class="btn">'+(onboarding?'Start my adventure':'Save preferences')+'</button></form>';
}
function settingsPage(){
 return intro('Settings','Make LUGHA work the way you learn best.')+'<div class="grid two"><section class="panel">'+(!state.profile.onboarded?btn('Open guided setup','onboarding','subtle small')+'<p></p>':'')+preferenceForm()+'<p></p>'+btn('Take optional placement quiz','start:placement:quiz','outline small')+'</section><div class="stack"><section class="panel"><h3>Account</h3><p>'+(state.guest?'Use a school-assigned account to keep your learning history.':'Your learning history is saved to your account.')+'</p><div class="row">'+(state.guest?btn('School sign-in','account'):btn('Sign out','logout','outline'))+'</div></section><section class="panel"><h3>Classroom</h3><p>Enter the joining code provided by your teacher.</p><form id="join-form"><label>Joining code<input name="code" required maxlength="20"></label><button class="btn subtle">Join classroom</button></form>'+(assignments.length?'<h3>Assignments</h3>'+assignments.map(x=>'<p>'+escape(x.title)+' · '+escape(x.name)+' '+link('Open assignment',assignmentRoute(x.lesson),'outline small')+'</p>').join(''):'')+'</section></div></div>';
}
const conversationTopics=[...tutorTopics,...roleplayTopics];
function tutorAvatar(){
 return '<svg viewBox="0 0 200 220" aria-hidden="true" focusable="false" class="layla-face"><path d="M22 216q7-39 49-49h58q42 10 49 49z" fill="#005baa"/><path d="M56 135q-19-12-14-46C42 53 64 27 100 27s58 26 58 62q5 34-14 46l8 45H48z" fill="#213653"/><path d="M83 151h34v32q-17 19-34 0z" fill="#bd7b58"/><ellipse cx="100" cy="103" rx="43" ry="54" fill="#dfa17c"/><path d="M55 96q-2-49 45-51 39 0 45 42-24-10-35-28-15 30-55 37z" fill="#213653"/><g class="layla-eyes" fill="#243149"><circle cx="81" cy="105" r="4"/><circle cx="119" cy="105" r="4"/></g><path d="M100 105l-4 14h7" fill="none" stroke="#b97452" stroke-width="2" stroke-linecap="round"/><path class="layla-smile" d="M87 131q13 13 26 0" fill="none" stroke="#82454a" stroke-width="3" stroke-linecap="round"/><ellipse class="layla-mouth" cx="100" cy="135" rx="10" ry="6" fill="#82454a"/><path d="M76 183l24 26 24-26-7-13q-17 20-34 0z" fill="#55c7ef"/></svg>';
}
function tutorCard(turn){
 return escape(turn.text)+(turn.sample?'<div class="tutor-example">'+ar(turn.sample)+(turn.transliteration?'<span>'+escape(turn.transliteration)+'</span>':'')+(turn.translation?'<span>'+escape(turn.translation)+'</span>':'')+btn('Hear phrase','speak:'+encodeURIComponent(turn.sample),'outline small')+'</div>':'');
}
function tutorPage(){
 const enabled=state.ai&&!state.guest&&state.role==='student';
 const active=tutor.topic!==null;
 const topic=active?conversationTopics[tutor.topic]:null;
 const transcript=tutor.history.map(turn=>'<div class="bubble '+(turn.role==='user'?'user':'')+'" dir="auto"><strong>'+(turn.role==='user'?'You':'Layla')+'</strong> '+tutorCard(turn)+'</div>').join('');
 return intro('AI Arabic Tutor','Practise everyday Arabic with Layla.')+
 '<div class="tutor-studio"><section class="panel tutor-stage"><div class="heading"><h2>Layla</h2><span class="chip">'+(tutor.ai?'AI conversation':'Guided practice')+'</span></div><div class="layla" role="img" aria-label="Animated portrait of Layla">'+tutorAvatar()+'</div><p id="tutor-status" role="status">'+(active?'Ready to practise':'Choose a conversation topic')+'</p><div class="row tutor-voice">'+(active?btn('Use microphone','mic')+btn('Replay audio','tutorreplay','outline small')+btn('Pause or resume','pause','outline small')+btn('Stop audio','tutorstop','outline small'):'')+'</div><p class="meta">Arabic audio uses your device’s voice. Microphone transcription may use your browser’s speech service.</p></section>'+
 '<section class="panel tutor-session"><div class="heading"><h2>Conversation topic</h2>'+(active?btn('Change topic','endtutor','outline small'):'')+'</div>'+
 (active?'<h3>'+escape(topic.title)+'</h3><p>'+escape(topic.description)+'</p><div class="row tutor-prompts">'+topic.prompts.map(([prompt],i)=>btn(escape(prompt),'tutorprompt:'+i,'subtle small')).join('')+'</div>':
 '<div class="tutor-topics">'+tutorTopics.map((item,i)=>btn('<span aria-hidden="true">'+item.icon+'</span><strong>'+escape(item.title)+'</strong><small>'+escape(item.description)+'</small>','tutortopic:'+i,'outline tutor-topic')).join('')+'</div><details class="tutor-transcript"><summary>More roleplay scenarios</summary><div class="row tutor-prompts">'+roleplayTopics.map((item,i)=>btn(escape(item.title),'tutortopic:'+(i+tutorTopics.length),'outline small')).join('')+'</div></details>')+
 (active?'<div class="chat" role="log" aria-label="Live captions">'+transcript+'</div><form id="chat-form"><label>Type or review your reply<input id="tutor-input" name="message" dir="auto" placeholder="Type or speak…" maxlength="600" required></label><button class="btn">Send</button></form><details class="tutor-transcript"><summary>Full session transcript</summary>'+transcript+'</details>':'')+
 '<div class="row tutor-mode">'+(enabled?(active?btn(tutor.ai?'Use guided practice':'Use AI conversation',tutor.ai?'guided':'tutorai','outline small'):'<p>Choose a topic, then switch to an AI conversation if you want to ask your own questions.</p>'):'<p>Guided Practice uses prepared examples. AI conversation requires a configured Gemini key and a signed-in student account.</p>')+'</div></section></div>';
}
function selectTutorTopic(index,ai=false){
 const topic=conversationTopics[index];
 if(!topic)return;
 stopAudio();recognition?.abort();
 tutor={topic:index,history:[{role:'model',...topic.opening}],ai};
 render();
 speak(topic.opening.sample,'ar',true);
}
async function sendTutor(message,submit){
 const session=tutor, topic=conversationTopics[session.topic];
 const text=message.trim();
 if(!topic||!text)return;
 const history=[...session.history,{role:'user',text}];
 if(submit){submit.disabled=true;submit.textContent='Waiting for Layla…';}
 const status=document.getElementById('tutor-status');
 if(status)status.textContent=session.ai?'Layla is preparing a response…':'Getting the next example…';
 try{
  const card=session.ai?await api('tutor',{topic:session.topic<tutorTopics.length?session.topic:undefined,scene:session.topic>=tutorTopics.length?session.topic-tutorTopics.length:undefined,history}).then(data=>({text:data.reply,sample:data.arabic,transliteration:data.transliteration,translation:data.translation})):guidedReply(topic,text);
  if(tutor!==session||route!=='tutor')return;
  session.history=[...history,{role:'model',...card}];
  render();
  document.querySelector('.chat')?.lastElementChild?.scrollIntoView({block:'nearest'});
  document.getElementById('tutor-input')?.focus({preventScroll:true});
  if(card.sample)speak(card.sample,'ar',true);
 }finally{
  if(status?.isConnected)status.textContent='Ready to practise';
  if(submit){submit.disabled=false;submit.textContent='Send';}
 }
}
function teacherPage(){
 return schoolLogo()+intro('Classrooms','Create a private classroom, assign lessons and view participation.')+'<div class="grid two"><section class="panel"><form id="class-create"><label>Classroom name<input name="name" maxlength="60" required></label><button class="btn">Create classroom</button></form></section><section class="panel" id="class-list"><p>Loading classrooms…</p></section></div><div id="class-detail"></div>';
}
async function loadClasses(){
 const rooms=await api('classrooms');
 if(!$('#class-list'))return;
 $('#class-list').innerHTML=rooms.length?rooms.map(x=>'<p>'+escape(x.name)+' '+btn('Open','room:'+x.id,'outline small')+'</p>').join(''):'<p>You have no classrooms yet.</p>';
}
async function showRoom(room){
 const [report,rooms,classWork,learners]=await Promise.all([api('classroom/report',{room}),api('classrooms'),api('classroom/assignments',{room}),api('classroom/learning',{room})]);
 const visible=rooms.find(x=>x.id===room)?.visible;
 const node=$('#class-detail');
 if(!node)return;
 node.innerHTML='<div class="panel" style="margin-top:14px"><h2>Classroom report</h2><p>Join code <strong>'+escape(room)+'</strong></p><form id="assign-form"><input type="hidden" name="room" value="'+escape(room)+'"><label>Assignment name<input name="title" maxlength="80"></label><label>Lesson, video or arcade mission<select name="lesson">'+lessons.map(x=>'<option value="'+x.id+'">'+escape(x.title)+'</option>').join('') +lessons.map(x=>'<option value="videos/'+x.id+'">Video · '+escape(x.title)+'</option>').join('') +Object.entries(cabinets).map(([key,g])=>'<option value="arcade/'+key+'">'+g.title+'</option>').join('')+'</select></label><button class="btn">Assign activity</button></form><div class="table-wrap"><table><thead><tr><th>Learner alias</th><th>XP</th><th>Lessons</th></tr></thead><tbody>'+report.map(x=>'<tr><td>'+escape(x.alias)+'</td><td>'+x.xp+'</td><td>'+x.lessons+'</td></tr>').join('')+'</tbody></table></div><h3>Assignment completion</h3>'+(classWork.map(x=>'<p>'+escape(x.title)+' · '+x.completed+' / '+x.assigned+' learners</p>').join('')||'<p>No assignments yet.</p>')+btn('Export CSV','export:'+room,'outline small')+' '+btn(visible?'Hide classroom leaderboard':'Enable classroom leaderboard','visibility:'+room+':'+(visible?'no':'yes'),'outline small')+'</div>';
 node.insertAdjacentHTML('beforeend','<section class="panel" style="margin-top:14px"><h3>Classroom learning overview</h3><label>Find a learner<input id="learner-filter" type="search"></label><div id="learner-list">'+(learners.map(row=>'<article class="panel" data-learner="'+escape(row.name.toLowerCase())+'"><h3>'+escape(row.name)+'</h3><p>'+escape(row.grade||'')+' · '+row.lessons+' lessons · '+row.games+' games</p><p>'+escape(row.latest?'Last activity '+row.latest.slice(0,10):'No activity yet')+'</p>'+(row.accommodations.length?'<details><summary>Authorised teaching accommodations</summary><p>'+escape(row.accommodations.join(', '))+'</p></details>':'')+'</article>').join('')||'<p>No enrolled learners yet.</p>')+'</div></section>');
 node.querySelector('#learner-filter').addEventListener('input',event=>{
  const term=event.currentTarget.value.trim().toLowerCase();
  node.querySelectorAll('[data-learner]').forEach(item=>{item.hidden=!item.dataset.learner.includes(term);});
 });
}
function renderSchoolAdmin(data){
 const host=document.getElementById('school-admin-workspace');
 if(!host)return;
 if(!data){host.innerHTML='<p>Connect Supabase to use school account management.</p>';return;}
 const options=role=>data.accounts.filter(x=>!role||x.role===role).map(x=>'<option value="'+escape(x.id)+'">'+escape(x.email)+' · '+escape(x.role)+'</option>').join('');
 const select=(name,title,role)=>'<label>'+title+'<select name="'+name+'" required><option value="">Choose…</option>'+options(role)+'</select></label>';
 const rooms='<label>Classroom<select name="room" required><option value="">Choose…</option>'+data.classes.map(x=>'<option value="'+escape(x.id)+'">'+escape(x.name)+'</option>').join('')+'</select></label>';
 const form=(title,action,fields)=>'<details class="panel"><summary>'+title+'</summary><form class="school-admin-form"><input type="hidden" name="action" value="'+action+'">'+fields+'<button class="btn">Save</button></form></details>';
 const role='<label>Role<select name="role"><option value="student">Student</option><option value="parent">Parent</option><option value="teacher">Teacher</option></select></label>';
 const support=['largeText','reducedMotion','audioInstructions','shortSteps','untimed'].map((key,i)=>'<label class="check"><input type="checkbox" name="support-'+key+'">'+['Larger text','Reduced motion','Audio instructions','Short steps','Untimed games'][i]+'</label>').join('');
 host.innerHTML='<div class="grid two">'+card('✦','Learning activity',data.stats.activities)+card('▤','Completed lessons',data.stats.lessons)+'</div><div class="grid two" style="margin:12px 0">'+
 (!state.demo?form('Create account','create-account','<label>Name<input name="name" required></label><label>Email<input type="email" name="email" required></label>'+role+'<label>Temporary password<input name="password" type="password" autocomplete="new-password" minlength="12" required></label>'):'')+
 form('Change account role','change-role',select('uid','Account')+role)+form('Deactivate account','disable-account',select('uid','Account'))+
 form('Reactivate account','activate-account',select('uid','Account'))+form('Create class','create-class',select('uid','Teacher','teacher')+'<label>Class name<input name="name" required></label>')+
 form('Assign teacher','assign-teacher',rooms+select('uid','Teacher','teacher'))+form('Enrol student','enrol-student',rooms+select('uid','Student','student'))+
 form('Link parent','link-parent',select('parent','Parent','parent')+select('uid','Student','student'))+
 form('Learning accommodations','save-student',select('uid','Student','student')+'<label>Grade<input name="grade"></label><label>Arabic proficiency<select name="level">'+opts(['Complete Beginner','Beginner','Intermediate','Advanced'],'Beginner')+'</select></label>'+support)+
 '</div><section class="panel"><h3>Recent administrative changes</h3>'+(data.events.map(x=>'<p>'+escape(x.action.replaceAll('-',' '))+' · '+escape(String(x.created_at).slice(0,10))+'</p>').join('')||'<p>No changes recorded yet.</p>')+'</section>';
}
function adminPage(){
 return intro('Content Studio','Manage school accounts, classes and Arabic learning materials.')+'<section id="school-admin-workspace" aria-label="School administration"><p>Loading school accounts…</p></section>'+'<section class="panel"><form id="content-form"><label>Edit a lesson<select name="existing" id="existing"><option value="">New lesson</option>'+lessons.map(x=>'<option value="'+x.id+'">'+escape(x.title)+'</option>').join('')+'</select></label><label>Lesson name<input name="title" required maxlength="120"></label><label>World<select name="world">'+worlds.map((x,i)=>'<option value="'+i+'">'+x[0]+'</option>').join('')+'</select></label><label>Vocabulary (one line per item, using Arabic | English | transliteration)<textarea required name="items"></textarea></label><button class="btn">Save lesson</button></form><div id="accounts"></div></section>';
}
const signInRoles=[['student','Student','home','Learn and practise Arabic'],['parent','Parent','help','Follow your linked children'],['teacher','Teacher','video','Teach and assign work'],['admin','Administrator','settings','Manage the school workspace']];
function account(){location.hash='login/'+signInRole;}
function loginPage(){
 const recovering=route==='recover';
 const mode=recovering?'reset':args[0]==='forgot'?'forgot':'login';
 const role=signInRoles.find(item=>item[0]===args[0])||signInRoles[0];
 if(mode==='login')signInRole=role[0];
 const logo=schoolLogo();
 return '<div class="identity-layout"><section class="identity-intro">'+logo+'<p class="label">A GIIS Student Innovation</p><h1>Welcome to LUGHA</h1><p>Play. Learn. Connect.</p>'+link('Explore as a guest','home','outline')+'</section><section class="panel identity-panel">'+
 (mode==='login'?'<h2>School sign-in</h2><p>Choose your role to continue.</p><nav class="identity-roles" aria-label="School sign-in roles">'+signInRoles.map(([id,title,symbol,desc])=>'<a href="#login/'+id+'" class="identity-role '+(role[0]===id?'selected':'')+'" '+(role[0]===id?'aria-current="page"':'')+'>'+icon(symbol)+'<strong>'+title+'</strong><small>'+desc+'</small></a>').join('')+'</nav>':'<h2>'+(mode==='forgot'?'Reset your password':'Choose a new password')+'</h2>')+
 (preview?'<p class="identity-status" role="status">School sign-in is unavailable in the public guest preview.</p>':'<form id="account-form"><input type="hidden" name="role" value="'+role[0]+'"><input type="hidden" name="mode" value="'+mode+'">'+
 (mode!=='reset'?'<label>School email<input name="email" type="email" autocomplete="username" required></label>':'')+
 (mode!=='forgot'?'<label>'+(mode==='reset'?'New password':'Password')+'<input id="school-password" name="password" type="password" minlength="'+(mode==='reset'?12:10)+'" maxlength="128" autocomplete="'+(mode==='reset'?'new-password':'current-password')+'" required></label>'+btn('Show password','showpassword','outline small'):'')+
 (mode==='login'?'<label class="check"><input name="remember" type="checkbox">Remember me on this device</label>':'')+
 '<p id="identity-error" role="alert" hidden></p><button class="btn">'+(mode==='forgot'?'Send reset link':mode==='reset'?'Update password':'Sign in as '+role[1])+'</button></form>')+
 (mode==='login'&&!preview?'<p><a href="#login/forgot">Forgot password?</a></p>':mode!=='login'?'<p><a href="#login/'+signInRole+'">Back to sign-in</a></p>':'')+'</section></div>';
}
function onboarding(){
 dialog.innerHTML='<div class="heading"><h2>Set up your adventure</h2>'+btn('Close','closedialog','outline small')+'</div><p>Choose the way you want to learn. You can change these preferences later.</p>'+preferenceForm(true);
 if(!dialog.open)dialog.showModal();
}
function render(){
 if(!state)return;
 apply();chrome();
 const views={home:state.role==='parent'?parentPage:state.role==='teacher'?teacherPage:home,adventure:()=>intro('The World of LUGHA','Complete each world’s lessons and boss challenge to unlock the next stop.')+'<div class="panel world-list">'+worlds.map(worldRow).join('')+'</div>',world:worldPage,lesson:lessonPage,game:gamePage,arcade:arcadePage,about,report,login:loginPage,recover:loginPage,activity:activityPage,tutor:tutorPage,writing:writingPage,videos:videosPage,revision,progress:progressPage,materials,rewards,settings:settingsPage,parent:parentPage,teacher:state.role==='teacher'?teacherPage:null,admin:state.role==='admin'?adminPage:null,more:()=>intro('Explore LUGHA','Find a learning activity or manage your account.')+'<div class="grid two">'+nav.concat(state.role==='parent'?[['parent','Family progress','chart']]:state.role==='teacher'?[['teacher','Classrooms','chart']]:state.role==='admin'?[['admin','Content Studio','pen']]:[]).map(([url,title,symbol])=>link(icon(symbol)+' '+title,url,'outline')).join('')+'</div>'};
 disposeArcade();
 const demoBanner=state.demo?'<aside class="panel preview-banner"><strong>Demonstration account</strong><span>Fictional records for testing.</span></aside>':'';
 const previewBanner=preview?'<aside class="panel preview-banner" aria-label="Preview mode"><strong>Guest preview</strong><span>Explore lessons and play the Arcade. Scores and settings last until you refresh.</span></aside>':'';
 main.innerHTML=demoBanner+previewBanner+(Object.hasOwn(views,route)&&views[route]||home)();
 mountCanvas();
 if(route==='arcade'&&gameRun&&!gameRun.done)disposeArcade=mountArcade(main,{gameRun,profile:state.profile,api,notify,onFinish(result){state=result.state;render();}});
 if(route==='progress')api('classroom-rankings').then(list=>{
  const target=$('#class-rankings');
  if(!target)return;
  target.innerHTML=list.length?list.map(row=>'<p>'+escape(row.name)+' · Learner '+escape(row.alias)+' · '+row.xp+' XP</p>').join(''):'<p>No shared classroom rankings are available.</p>';
 }).catch(e=>{if($('#class-rankings'))$('#class-rankings').textContent=e.message;});
 if((route==='teacher'||route==='home')&&state.role==='teacher')loadClasses().catch(e=>notify(e.message));
 if(route==='admin')api('admin/school').then(renderSchoolAdmin).catch(e=>notify(e.message));
 if(route==='admin')api('admin').then(list=>{if($('#accounts'))$('#accounts').innerHTML='<h3 style="margin-top:14px">Registered accounts</h3>'+list.map(x=>'<p>'+escape(x.email)+' · '+escape(x.role)+'</p>').join('');}).catch(e=>notify(e.message));
}
function stopAudio(){
 window.speechSynthesis?.cancel();playing=null;
 document.querySelector('.layla')?.classList.remove('talking');
 document.getElementById('tutor-status')?.replaceChildren('Ready to practise');
}
function speak(value,language='ar',quiet=false){
 if(!value||!('speechSynthesis' in window)){notify('Arabic speech is unavailable on this device.');return;}
 const voice=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().split(/[-_]/)[0]===language);
 if(!voice){if(!quiet)notify('No Arabic voice is installed. Add an Arabic voice in your device settings to use audio.');return;}
 stopAudio();
 playing=new SpeechSynthesisUtterance(value);playing.voice=voice;playing.lang=voice.lang;playing.rate=state.profile.speed;
 playing.onstart=()=>$('.layla')?.classList.add('talking');
 playing.onend=()=>$('.layla')?.classList.remove('talking');
 playing.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))notify('Arabic audio could not play.');$('.layla')?.classList.remove('talking');};
 speechSynthesis.speak(playing);
}
function mic(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){notify('Microphone transcription is unavailable in this browser. You can type your reply.');return;}
 if(recognition){recognition.stop();return;}
 if(!window.confirm('Allow microphone transcription for this reply? Your browser may send audio to its speech service.'))return;
 stopAudio();
 recognition=new Speech();recognition.lang='ar-AE';
 recognition.onresult=e=>{if($('#tutor-input'))$('#tutor-input').value=e.results[0][0].transcript;};
 recognition.onerror=e=>notify(e.error==='not-allowed'?'Microphone permission was declined. You can type your reply.':'Transcription could not start. You can type your reply.');
 recognition.onend=()=>{recognition=null;document.getElementById('tutor-status')?.replaceChildren('Ready to practise');$('.layla')?.classList.remove('talking');};
 try{recognition.start();$('.layla')?.classList.add('talking');document.getElementById('tutor-status')?.replaceChildren('Listening for Arabic…');}catch{recognition=null;notify('The microphone could not start.');}
}
function putText(input,value){
 if(!input)return;
 input.setRangeText(value,input.selectionStart??input.value.length,input.selectionEnd??input.value.length,'end');
 input.focus();
}
function prepareSound(){
 if(!state?.profile.sound||!window.AudioContext)return;
 earcons ||= new AudioContext();
 if(earcons.state==='suspended')earcons.resume().catch(()=>{});
}
function playFeedback(correct){
 if(!earcons||!state.profile.sound||earcons.state!=='running')return;
 const oscillator=earcons.createOscillator(),gain=earcons.createGain(),now=earcons.currentTime;
 oscillator.frequency.setValueAtTime(correct?520:275,now);
 oscillator.frequency.linearRampToValueAtTime(correct?660:240,now+.12);
 gain.gain.setValueAtTime(.05,now);
 gain.gain.exponentialRampToValueAtTime(.001,now+.15);
 oscillator.connect(gain).connect(earcons.destination);
 oscillator.start(now);oscillator.stop(now+.15);
}
async function answer(value){
 prepareSound();
 const r=round;
 const reply=await api('answer',{id:r.id,position:r.position,answer:value});
 r.correct=reply.correct;
 r.combo=reply.correct?r.combo+1:0;
 r.bestCombo=Math.max(r.bestCombo,r.combo);
 playFeedback(reply.correct);
 if(reply.finished){r.score=reply.score;r.position=r.total;r.earned=reply.earned;r.recommendation=reply.recommendation;state=reply.state;}
 else if(reply.next){Object.assign(r,{next:reply.next,position:reply.position,order:[],pairs:[],selected:[],feedback:!reply.correct?'Answer recorded.':r.combo>=3?'Combo ×'+r.combo+'! Keep it going.':'Correct! Keep going.'});}
 else {r.feedback='That choice didn’t work. Take your time and try again.';}
 if(round===r&&route==='activity'){render();main.focus({preventScroll:true});}
}
let viewQueue=Promise.resolve();
function saveVideoSlide(lesson,slide){
 if(preview)return;
 const session=state;
 viewQueue=viewQueue.then(async()=>{
  if(state!==session)return;
  const result=await api('video-progress',{lesson,slide});
  if(state===session)state.viewing=[...(state.viewing||[]).filter(item=>item.lesson!==lesson),result];
 }).catch(()=>{});
}
function slide(next=0){
 if(!video||route!=='videos'||!args[0])return;
 const lesson=lessons.find(x=>x.id===video.id);
 video.index=Math.min(lesson.items.length-1,Math.max(0,video.index+next));
 video.visited.add(video.index);
 saveVideoSlide(video.id,video.index);
 render();
 if(video.running){
  speak(lesson.items[video.index].ar);
  clearTimeout(tracking);
  tracking=setTimeout(()=>{
   if(video.index===lesson.items.length-1){video.running=false;video.ended=true;render();}
   else slide(1);
  },6000/(video.speed??state.profile.videoSpeed??1));
 }
}
function routeChange(){
 if(video)video.running=false;
 clearTimeout(tracking);stopAudio();recognition?.abort();
 [route,...args]=(location.hash.slice(1)||'home').split('/');
 if(route==='games'){route='videos';args=['games'];history.replaceState(null,'','#videos/games');}
 if(route!=='arcade'||gameRun?.config.game!==args[0])gameRun=null;
 const request=++accountRequest;
 if(state.role==='parent'&&['parent','home'].includes(route))api('parent/children').then(children=>{if(request===accountRequest&&state.role==='parent'&&['parent','home'].includes(route)){parentChildren=children;render();}}).catch(e=>notify(e.message));
 if(route==='settings')api('assignments').then(list=>{assignments=list;if(route==='settings'&&!document.activeElement?.closest('form'))render();}).catch(()=>{});
 render();
 if(route==='videos'&&args[0]==='games'){
  const heading=document.getElementById('arcade-heading');
  heading?.focus({preventScroll:true});
  heading?.scrollIntoView({block:'start'});
 }else{
  if(route==='videos')window.scrollTo(0,0);
  main.focus({preventScroll:true});
 }
}
async function action(name,raw){
 switch(name){
  case 'showpassword':{const input=document.getElementById('school-password');if(input){input.type=input.type==='password'?'text':'password';document.querySelector('[data-action=showpassword]').textContent=input.type==='password'?'Show password':'Hide password';}return;}
  case 'account':account();return;
  case 'arcadereset':gameRun=null;render();return;
  case 'print':window.print();return;
  case 'onboarding':onboarding();return;
  case 'placementlevel':state=await api('settings',{level:round.recommendation});location.hash='settings';return;
  case 'profile':location.hash='settings';return;
  case 'closedialog':dialog.close();return;
  case 'logout':await api('logout',{});resetSmartArabic();state=await api('guest',{});location.hash='home';render();account();return;
  case 'meaning':study.meaning=!study.meaning;break;
  case 'example':study.example=!study.example;break;
  case 'study':study.cursor+=Number(raw);study.meaning=study.example=false;stopAudio();break;
  case 'start':{const [kind,target]=raw.split(':');await start(kind,target);return;}
  case 'replay':await start(round.kind,round.target,round.difficulty,round.visual);return;
  case 'speak':speak(decodeURIComponent(raw));return;
  case 'pause':if(window.speechSynthesis?.paused)speechSynthesis.resume();else if(window.speechSynthesis?.speaking)speechSynthesis.pause();return;
  case 'answer':await answer(round.next.options[Number(raw)]);return;
  case 'visualgame':await start('game',4,round.difficulty,true);return;
  case 'order':if(!round.order.includes(Number(raw)))round.order.push(Number(raw));break;
  case 'undoorder':round.order.pop();break;
  case 'checkorder':await answer(round.order.map(i=>round.next.options[i]).join(round.next.join));return;
  case 'memory':
   round.selected.push(Number(raw));
   if(round.selected.length===2){round.pairs.push(round.selected);round.selected=[];}
   break;
  case 'resetmemory':round.pairs=[];round.selected=[];break;
  case 'checkmemory':await answer(JSON.stringify(round.pairs.map(pair=>pair.map(i=>round.next.options[i]).sort().join('|')).sort()));return;
  case 'undo-stroke':strokes.pop();$('#canvas')?.paint();return;
  case 'clear-stroke':strokes=[];$('#canvas')?.paint();return;
  case 'trace-answer':
   if(!strokes.length&&!$('#typed-ar')?.value.trim())throw Error('Trace the model or enter your writing first.');
   await answer('I reviewed my work');return;
  case 'key':putText($('#typed-ar'),decodeURIComponent(raw));return;
  case 'writingprev':writing.index=Math.max(0,writing.index-1);writing.reveal=false;break;
  case 'writingnext':writing.index=Math.min(lessons.flatMap(x=>x.items).length-1,writing.index+1);writing.reveal=false;break;
  case 'writingmode':writing.dictation=raw==='dictation';writing.reveal=false;break;
  case 'reveal-writing':writing.reveal=true;{const guide=$('.trace-guide');guide.textContent=lessons.flatMap(x=>x.items)[writing.index].ar;}return;
  case 'save-writing':{
   if(!strokes.length&&!$('#typed-ar')?.value.trim())throw Error('Write something before saving your self-assessment.');
   const attempt=await api('attempt',{kind:'writing',target:raw});
   const result=await api('answer',{id:attempt.id,position:0,answer:'I reviewed my work'});
   state=result.state;notify('Writing practice saved.');break;
  }
  case 'video-play':video.running=!video.running;if(!video.running){clearTimeout(tracking);stopAudio();break;}if(video.ended){video.index=0;video.visited=new Set([0]);video.ended=false;}slide();return;
  case 'video-prev':slide(-1);return;
  case 'video-next':slide(1);return;
  case 'shop':state=await api('shop',{item:Number(raw)});notify('Cosmetic equipped.');break;
  case 'tutortopic':selectTutorTopic(Number(raw));return;
  case 'tutorprompt':{const prompt=conversationTopics[tutor.topic]?.prompts[Number(raw)]?.[0];if(prompt)await sendTutor(prompt);return;}
  case 'guided':selectTutorTopic(tutor.topic);return;
  case 'tutorai':if(state.ai&&!state.guest&&state.role==='student')selectTutorTopic(tutor.topic,true);return;
  case 'endtutor':stopAudio();recognition?.abort();tutor={topic:null,history:[],ai:false};break;
  case 'tutorreplay':{const last=tutor.history.findLast(entry=>entry.sample);if(last)speak(last.sample);return;}
  case 'tutorstop':stopAudio();return;
  case 'mic':mic();return;
  case 'room':await showRoom(raw);return;
  case 'visibility':{const [room,enabled]=raw.split(':');await api('classroom/visibility',{room,visible:enabled==='yes'});await showRoom(room);notify('Leaderboard visibility updated.');return;}
  case 'export':{
   const report=await api('classroom/report',{room:raw});
   const href=URL.createObjectURL(new Blob(['Learner alias,XP,Lessons\n'+report.map(x=>[x.alias,x.xp,x.lessons].join(',')).join('\n')],{type:'text/csv'}));
   const a=document.createElement('a');a.href=href;a.download='lugha-classroom.csv';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);return;
  }
  default:return;
 }
 render();
}
document.addEventListener('click',async event=>{
 const control=event.target.closest('[data-action]');
 if(!control||busy)return;
 const [name,...parts]=control.dataset.action.split(':');
 busy=true;
 try{await action(name,parts.join(':'));}catch(e){notify(e.message);}finally{busy=false;}
});
document.addEventListener('submit',async event=>{
 event.preventDefault();
 if(busy)return;
 busy=true;
 const form=event.target, data=Object.fromEntries(new FormData(form,event.submitter));
 try{
  if(form.classList.contains('school-admin-form')){
   data.support=Object.fromEntries(Object.keys(data).filter(key=>key.startsWith('support-')).map(key=>[key.slice(8),true]));
   await api('admin/school',data);
   renderSchoolAdmin(await api('admin/school'));
   notify('School record updated.');
   return;
  }
  switch(form.id){
   case 'preferences':{
    const first=dialog.contains(form);
    for(const key of ['minutes','english','arabic','spacing','speed','videoSpeed'])if(key in data)data[key]=Number(data[key]);
    for(const check of form.querySelectorAll('input[type=checkbox]'))data[check.name]=check.checked;
    state=await api('settings',{...data,onboarded:true});
    if(first)dialog.close();
    render();notify('Preferences saved.');break;
   }
   case 'account-form':{
    const message=document.getElementById('identity-error');
    message.hidden=true;
    try{
     if(data.mode==='forgot'){
      await api('recover',{email:data.email});
      notify('If the account is eligible, a reset link will be sent.');
     }else if(data.mode==='reset'){
      await api('reset',{token:args[0],password:data.password});
      location.hash='login/'+signInRole;
      notify('Password updated. Sign in with the new password.');
     }else{
      state=await api('login',{email:data.email,password:data.password,role:data.role,remember:data.remember==='on'});
      resetSmartArabic();
      parentChildren=[];parentChild='';
      location.hash=({parent:'parent',teacher:'teacher',admin:'admin'})[state.role]||'home';
      routeChange();
     }
    }catch(e){if(message.isConnected){message.textContent=e.message;message.hidden=false;}}
    break;
   }   case 'arcade-start':{
    const name=args[0],world=data.world===''?null:Number(data.world);
    const result=await api('arcade/start',{game:name,difficulty:data.difficulty,world,assist:data.assist==='on',...(args[2]?{lesson:args[2]}:{})});
    result.lesson=args[2]||null;
    if(route==='arcade'&&args[0]===name){gameRun=result;render();}
    break;
   }
   case 'game-form':await start('game',args[0],data.difficulty,data.format==='Text');break;
   case 'filters':filters=data;render();break;
   case 'join-form':await api('join',data);assignments=await api('assignments');render();notify('Classroom joined.');break;
   case 'class-create':{const result=await api('classroom/create',data);form.reset();await loadClasses();await showRoom(result.code);notify('Classroom created.');break;}
   case 'assign-form':await api('classroom/assign',data);await showRoom(data.room);notify('Activity assigned.');break;
   case 'content-form':{
    const id=data.existing||'l'+crypto.randomUUID().replace(/-/g,'').slice(0,18);
    const items=data.items.split('\n').filter(line=>line.trim()).map(line=>{const [ar,en,say]=line.split('|').map(x=>x.trim());return {ar,en,say};});
    lessons=await api('admin/lesson',{lesson:{id,title:data.title,world:Number(data.world),items}});render();notify('Lesson saved.');break;
   }
   case 'chat-form':await sendTutor(data.message,event.submitter);break;
  }
 }catch(e){notify(e.message);}finally{busy=false;}
});
document.addEventListener('change',event=>{
 const {id,value}=event.target;
 if(id==='video-pace'&&video){video.speed=Number(value);if(video.running)slide();}
 if(id==='parent-child'){parentChild=value;render();document.getElementById("parent-child")?.focus();}
 if(id==='existing'){
  const lesson=lessons.find(x=>x.id===value),form=event.target.form;
  form.elements.title.value=lesson?.title||'';
  form.elements.world.value=lesson?.world||0;
  form.elements.items.value=lesson?.items.map(x=>[x.ar,x.en,x.say].join(' | ')).join('\n')||'';
 }
});
window.addEventListener('hashchange',routeChange);
async function init(){
 try{
  state=await api('state');
  if(state?.preview){
   preview=createPreview();
   state=preview.state;
   lessons=preview.lessons;
   branding={logo:true};
  }
  if(!preview)[lessons,branding]=await Promise.all([api('content'),api('branding')]);
  if(!state)state=await api('guest',{});
  resetSmartArabic=mountSmartArabic({
   icon,speak,canAsk:()=>state.ai&&!state.guest&&state.role==='student',
   inChallenge:()=>route==='activity'||route==='game'||(route==='arcade'&&gameRun&&!gameRun.done),
   ask:history=>api('tutor',{assistant:'smartarabic',history})
  });
  routeChange();
 }catch(e){main.innerHTML='<section class="panel"><img class="giis-logo" src="/giis-logo.png" alt="Global Indian International School"><h1>'+ (e.status===503?'LUGHA is temporarily unavailable':'LUGHA could not start') +'</h1><p>'+escape(e.message)+'</p><a class="btn" href="/">Retry</a></section>';}
}
init();
