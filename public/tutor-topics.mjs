import { scenes } from './content.mjs';

const phrase=(translation,sample,transliteration,text)=>({translation,sample,transliteration,text});
export const tutorTopics=[
 {title:'Greetings',icon:'✦',description:'Greet someone and respond politely.',opening:phrase('Peace be upon you','السَّلَامُ عَلَيْكُمْ','As-salāmu ʿalaykum','This is a common greeting. Try saying it or choose a prompt.'),prompts:[
  ['Repeat the greeting',phrase('Peace be upon you','السَّلَامُ عَلَيْكُمْ','As-salāmu ʿalaykum','Listen to the greeting, then try saying it at your own pace.')],
  ['How do I reply?',phrase('And peace be upon you','وَعَلَيْكُمُ السَّلَامُ','Wa ʿalaykumu s-salām','Use this reply when someone says as-salāmu ʿalaykum.')],
  ['Good morning?',phrase('Good morning','صَبَاحُ الْخَيْرِ','Ṣabāḥu l-khayr','This is a friendly greeting for the morning.')]
 ]},
 {title:'Introducing Yourself',icon:'◎',description:'Introduce yourself without sharing personal details.',opening:phrase('My name is Layla','اسْمِي لَيْلَى','Ismī Laylā','Use a fictional name to practise introducing yourself.'),prompts:[
  ['My name is Noor',phrase('My name is Noor','اسْمِي نُورٌ','Ismī Nūr','Start with ismī, then say your name.')],
  ['What is your name?',phrase('What is your name?','مَا اسْمُكَ؟','Mā ismuk?','This form is used when speaking to a boy or man.')],
  ['Nice to meet you',phrase('Pleased to meet you','تَشَرَّفْتُ بِلِقَائِكَ','Tasharraftu biliqāʾik','Use this polite phrase when you meet someone.')]
 ]},
 {title:'Shopping',icon:'◇',description:'Ask prices and choose items at a market.',opening:phrase('How much is this?','بِكَمْ هَذَا؟','Bikam hādhā?','Imagine you are at the market. Try asking the price.'),prompts:[
  ['How much is this?',phrase('How much is this?','بِكَمْ هَذَا؟','Bikam hādhā?','Use this to ask for the price of an item.')],
  ['I want to buy this',phrase('I want to buy this','أُرِيدُ أَنْ أَشْتَرِيَ هَذَا','Urīdu an ashtariya hādhā','Use urīdu to say what you would like.')],
  ['Too expensive!',phrase('This is very expensive','هَذَا غَالٍ جِدًّا','Hādhā ghālin jiddan','Add jiddan to say very.')]
 ]},
 {title:'Family Words',icon:'⌂',description:'Practise vocabulary for family members.',opening:phrase('Family','عَائِلَةٌ','ʿĀʾila','Choose a family word to practise.'),prompts:[
  ['Father',phrase('Father','أَبٌ','Ab','Use abī to say my father.')],
  ['Mother',phrase('Mother','أُمٌّ','Umm','Use ummī to say my mother.')],
  ['Brother and sister',phrase('A brother and a sister','أَخٌ وَأُخْتٌ','Akh wa ukht','Wa connects the two words and means and.')]
 ]},
 {title:'Food & Drink',icon:'◈',description:'Order food and ask for a drink.',opening:phrase('I would like water','أُرِيدُ مَاءً','Urīdu māʾan','Imagine you are ordering at a café. Say what you would like.'),prompts:[
  ['I want water',phrase('I would like water','أُرِيدُ مَاءً','Urīdu māʾan','Start with urīdu and add what you want.')],
  ['What is bread?',phrase('Bread','خُبْزٌ','Khubz','Khubz is the Arabic word for bread.')],
  ['I am hungry',phrase('I am hungry','أَنَا جَائِعٌ','Anā jāʾiʿ','This form is used by a boy or man. A girl or woman says anā jāʾiʿa.')]
 ]},
 {title:'Everyday Chat',icon:'☏',description:'Use everyday phrases in a short conversation.',opening:phrase('How are you?','كَيْفَ حَالُكَ؟','Kayfa ḥāluk?','Try answering, or choose a phrase to hear first.'),prompts:[
  ['I am fine, thanks',phrase('I am fine, thank you','أَنَا بِخَيْرٍ، شُكْرًا','Anā bikhayr, shukran','Use this as a simple answer when someone asks how you are.')],
  ['How do you say hello?',phrase('Hello','مَرْحَبًا','Marḥaban','Marḥaban works as a general greeting.')],
  ['See you later',phrase('See you later','إِلَى اللِّقَاءِ','Ilā l-liqāʾ','Use this when you are saying goodbye.')]
 ]}
];

const normalize=value=>value.toLowerCase().normalize('NFC').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[^\p{L}\p{N}\s]/gu,'').replace(/\s+/g,' ').trim();
export function guidedReply(topic,message){
 const text=normalize(message);
 if(!text)return null;
 const entry=topic.prompts.find(([prompt,card])=>[prompt,card.sample,card.translation,card.transliteration].some(value=>typeof value==='string'&&normalize(value)===text));
 if(entry)return entry[1];
 if(['repeat','say it again','repeat please',normalize(topic.opening.sample)].includes(text))return topic.opening;
 return {text:'Guided Practice uses prepared examples. Pick one of the suggested prompts, or try repeating the Arabic phrase.'};
}

export const roleplayTopics=scenes.map(([title,question,answer])=>({
 title,icon:'☏',description:'Practise a short Arabic roleplay.',
 opening:{text:'Listen to the question and try an answer in Arabic.',sample:question},
 prompts:[['Show an example reply',{text:'Here is one way to answer in Arabic.',sample:answer}]]
}));
