import {tutorTopics} from './tutor-topics.mjs';

const shortcuts=[
 ['Say good morning','Good morning'],
 ['Find Arabic games','Where are the games?'],
 ['Turn on larger text','How do I make text bigger?']
];
const normalize=value=>value.normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const phrases=tutorTopics.flatMap(topic=>[topic.opening,...topic.prompts.map(([,phrase])=>phrase)])
 .flatMap(phrase=>[phrase.translation,phrase.sample].map(value=>[normalize(value),phrase]))
 .sort(([left],[right])=>right.length-left.length);

function guidedAnswer(message,inChallenge){
 const words=normalize(message);
 if(/\b(game|games|arcade)\b/.test(words))return {text:'Open Videos & Games and scroll below the lessons to find the Arcade.',link:['Explore the Arcade','#videos']};
 if(/\b(video|videos|watch|captions)\b/.test(words))return {text:'Open Videos & Games to watch Arabic lessons. You can read the transcript or change the playback speed.',link:['Browse videos','#videos']};
 if(/\b(accessibility|bigger|larger|contrast|font|motion)\b/.test(words))return {text:'Open Settings to adjust your reading size, contrast and motion preferences.',link:['Open Settings','#settings']};
 if(/\b(progress|xp|gems|points|rewards)\b/.test(words))return {text:'My Progress shows lesson completions, XP and achievements. Sign in with your school account to keep your progress across devices.',link:['View My Progress','#progress']};
 if(/\b(sign in|login|password)\b/.test(words))return {text:'Choose your school role on the sign-in page. Use Forgot password if you need help accessing your account.',link:['School sign-in','#login/student']};
 if(inChallenge)return {text:'Arabic practice is paused during this challenge. Finish the round to practise phrases here.'};
 if(/\b(answer|solution|solve)\b/.test(words))return {text:'I can help you practise the topic with a separate example. Try asking about a greeting, a family word or a food phrase.'};
 const match=phrases.find(([phrase])=>phrase&&(' '+words+' ').includes(' '+phrase+' '));
 if(match)return match[1];
 return {text:'I can help with Arabic phrases and finding your way around LUGHA. Try “Good morning”, “Where are the games?” or open Layla for a guided conversation.',link:['Practise with Layla','#tutor']};
}

export function mountSmartArabic({icon,ask,canAsk,speak,inChallenge}){
 const root=document.createElement('div');
 root.id='smart-arabic';
 root.innerHTML=`
  <button type="button" class="smart-launch" aria-expanded="false" aria-controls="smart-panel">${icon('chat')} SmartArabic</button>
  <section id="smart-panel" aria-labelledby="smart-title" hidden>
   <header class="smart-header">
    <span class="smart-mark" lang="ar" aria-hidden="true">ع</span>
    <div><h2 id="smart-title">SmartArabic</h2><p>Arabic practice and LUGHA help</p></div>
    <button type="button" class="smart-close" aria-label="Close SmartArabic">×</button>
   </header>
   <div class="smart-messages" role="log" aria-label="Conversation"></div>
   <div class="smart-shortcuts" aria-label="Suggested questions"></div>
   <form class="smart-form">
    <label class="smart-label" for="smart-input">Ask SmartArabic</label>
    <input id="smart-input" name="message" dir="auto" maxlength="400" placeholder="Ask about Arabic…" autocomplete="off" required>
    <button type="submit" class="btn small">Send</button>
   </form>
  </section>`;
 document.body.append(root);
 const launch=root.querySelector('.smart-launch'),panel=root.querySelector('#smart-panel');
 const messages=root.querySelector('.smart-messages'),form=root.querySelector('form');
 const input=form.elements.message,sendButton=form.querySelector('button');
 let turn=0,history=[];

 function show(open,focus=true){
  panel.hidden=!open;
  launch.setAttribute('aria-expanded',String(open));
  if(focus)(open?input:launch).focus({preventScroll:true});
 }
 function addMessage(role,card){
  const message=document.createElement('div');
  message.className='smart-message '+(role==='user'?'smart-user':'smart-reply');
  const text=document.createElement('p');
  text.dir='auto';
  text.textContent=card.text;
  message.append(text);
  if(card.sample){
   const phrase=document.createElement('bdi');
   phrase.className='ar';
   phrase.lang='ar';
   phrase.dir='rtl';
   phrase.textContent=card.sample;
   const description=document.createElement('small');
   description.textContent=[card.transliteration,card.translation].filter(Boolean).join(' · ');
   const audio=document.createElement('button');
   audio.type='button';
   audio.className='btn outline small';
   audio.textContent='Hear Arabic';
   audio.onclick=()=>speak(card.sample);
   message.append(phrase,description,audio);
  }
  if(card.link){
   const link=document.createElement('a');
   [link.textContent,link.href]=card.link;
   link.onclick=()=>show(false,false);
   message.append(link);
  }
  messages.append(message);
  messages.scrollTop=messages.scrollHeight;
  return message;
 }
 const suggestions=root.querySelector('.smart-shortcuts');
 async function send(value,useAI=true){
  const text=value.trim();
  if(!text||sendButton.disabled)return;
  input.value='';
  suggestions.hidden=true;
  addMessage('user',{text});
  const id=++turn;
  let card=guidedAnswer(text,inChallenge());
  if(useAI&&canAsk()&&card.link?.[1]==='#tutor'){
   sendButton.disabled=true;
   const waiting=addMessage('model',{text:'Thinking…'});
   try{
    const reply=await ask([...history,{role:'user',text}].slice(-9));
    card={text:reply.reply,sample:reply.arabic,transliteration:reply.transliteration,translation:reply.translation};
    if(id===turn)history=[...history,{role:'user',text},{role:'model',text:card.text}].slice(-8);
   }catch{
    card={...card,text:'Live replies are unavailable right now. '+card.text};
   }finally{
    waiting.remove();
    if(id===turn)sendButton.disabled=false;
   }
  }
  if(id===turn)addMessage('model',card);
 }
 shortcuts.forEach(([label,value])=>{
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.onclick=()=>{input.focus();void send(value,false);};
  suggestions.append(button);
 });
 launch.onclick=()=>show(panel.hidden);
 root.querySelector('.smart-close').onclick=()=>show(false);
 panel.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   event.stopPropagation();
   show(false);
  }
 });
 form.addEventListener('submit',event=>{event.preventDefault();void send(input.value);});
 function reset(){
  ++turn;
  history=[];
  input.value='';
  sendButton.disabled=false;
  messages.replaceChildren();
  suggestions.hidden=false;
  addMessage('model',{text:'Marḥaban! Ask me for an Arabic phrase or help finding something in LUGHA.'});
 }
 reset();
 return reset;
}
