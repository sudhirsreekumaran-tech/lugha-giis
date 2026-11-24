import { additionalLessons, additionalScenes, extensions } from './curriculum.mjs';
export const worlds = [
 ['Alphabet Oasis','أ','Find your first letters in a desert oasis.','lavender'],
 ['Greeting Gardens','✿','Say hello and meet someone new.','mint'],
 ['Vocabulary Village','⌂','Discover words for the things around you.','peach'],
 ['Grammar Galaxy','✦','See how Arabic sentences fit together.','blue'],
 ['Conversation City','☏','Use Arabic in everyday conversations.','pink'],
 ['Writing Kingdom','✎','Connect letters and put your ideas on paper.','yellow'],
 ['Arabian Adventure','☀','Explore the desert and Emirati heritage.','peach'],
 ['Arabic Mastery Mountain','▲','Read, discuss and interpret longer Arabic texts.','lavender']
];
const letters = 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' ');
const names = 'Alif|Bāʾ|Tāʾ|Thāʾ|Jīm|Ḥāʾ|Khāʾ|Dāl|Dhāl|Rāʾ|Zāy|Sīn|Shīn|Ṣād|Ḍād|Ṭāʾ|Ẓāʾ|ʿAyn|Ghayn|Fāʾ|Qāf|Kāf|Lām|Mīm|Nūn|Hāʾ|Wāw|Yāʾ'.split('|');
const groups = [
 [1,'Hello and goodbye','مَرْحَبًا|Hello|Marḥaban;السَّلَامُ عَلَيْكُمْ|Peace be upon you|As-salāmu ʿalaykum;وَعَلَيْكُمُ السَّلَامُ|And peace be upon you|Wa ʿalaykumu s-salām;إِلَى اللِّقَاءِ|See you later|Ilā l-liqāʾ'],
 [1,'Being polite','شُكْرًا|Thank you|Shukran;عَفْوًا|You are welcome|ʿAfwan;مِنْ فَضْلِكَ|Please (to a man)|Min faḍlik;آسِفٌ|I am sorry (male speaker)|Āsifun'],
 [1,'Getting acquainted','كَيْفَ حَالُكَ؟|How are you? (to a man)|Kayfa ḥāluk?;أَنَا بِخَيْرٍ|I am well|Anā bikhayr;مَا اسْمُكَ؟|What is your name? (to a man)|Mā ismuk?;اسْمِي نُورٌ|My name is Noor|Ismī Nūr'],
 [2,'Colours','أَحْمَرُ|Red|Aḥmar;أَزْرَقُ|Blue|Azraq;أَخْضَرُ|Green|Akhḍar;أَصْفَرُ|Yellow|Aṣfar'],
 [2,'Numbers','وَاحِدٌ|One|Wāḥid;اِثْنَانِ|Two|Ithnān;ثَلَاثَةٌ|Three|Thalātha;أَرْبَعَةٌ|Four|Arbaʿa;خَمْسَةٌ|Five|Khamsa'],
 [2,'Animals','ثَعْلَبٌ|Fox|Thaʿlab;جَمَلٌ|Camel|Jamal;قِطَّةٌ|Cat|Qiṭṭa;طَائِرٌ|Bird|Ṭāʾir'],
 [2,'Fruits and vegetables','تُفَّاحَةٌ|Apple|Tuffāḥa;مَوْزَةٌ|Banana|Mawza;جَزَرٌ|Carrots|Jazar;خِيَارٌ|Cucumber|Khiyār'],
 [2,'Family and school','أُمٌّ|Mother|Umm;أَبٌ|Father|Ab;كِتَابٌ|Book|Kitāb;قَلَمٌ|Pen|Qalam;حَقِيبَةٌ|Bag|Ḥaqība'],
 [3,'Pronouns','أَنَا|I|Anā;نَحْنُ|We|Naḥnu;هُوَ|He|Huwa;هِيَ|She|Hiya'],
 [3,'Questions and location','أَيْنَ|Where|Ayna;مَتَى|When|Matā;فِي|In|Fī;تَحْتَ|Under|Taḥta'],
 [3,'Gender and agreement','طَالِبٌ|Male student|Ṭālib;طَالِبَةٌ|Female student|Ṭāliba;بَيْتٌ كَبِيرٌ|A big house|Baytun kabīrun;مَدْرَسَةٌ كَبِيرَةٌ|A big school|Madrasatun kabīratun'],
 [4,'At the market','كَمِ السِّعْرُ؟|How much does it cost?|Kamis-siʿr?;أُرِيدُ تُفَّاحَةً|I would like an apple|Urīdu tuffāḥa;هَذَا غَالٍ|This is expensive|Hādhā ghālin'],
 [4,'At the restaurant','أُرِيدُ مَاءً|I would like water|Urīdu māʾan;أَيْنَ قَائِمَةُ الطَّعَامِ؟|Where is the menu?|Ayna qāʾimatu ṭ-ṭaʿām?;الْحِسَابَ مِنْ فَضْلِكَ|The bill, please|Al-ḥisāba min faḍlik'],
 [4,'Finding your way','أَيْنَ الْمَحَطَّةُ؟|Where is the station?|Ayna l-maḥaṭṭa?;اِذْهَبْ يَمِينًا|Go right (to a man)|Idhhab yamīnan;اِذْهَبْ يَسَارًا|Go left (to a man)|Idhhab yasāran'],
 [5,'Letters in words','بَيْتٌ|House|Bayt;بَابٌ|Door|Bāb;حَلِيبٌ|Milk|Ḥalīb'],
 [5,'Writing a sentence','أَنَا أَقْرَأُ|I read|Anā aqraʾ;هِيَ تَكْتُبُ|She writes|Hiya taktub;نَحْنُ نَتَعَلَّمُ|We are learning|Naḥnu nataʿallam'],
 [6,'The desert','صَحْرَاءُ|Desert|Ṣaḥrāʾ;وَاحَةٌ|Oasis|Wāḥa;نَخْلَةٌ|Date palm|Nakhla;رِمَالٌ|Sands|Rimāl'],
 [6,'Emirati heritage','صَقْرٌ|Falcon|Ṣaqr;سُوقٌ تَقْلِيدِيٌّ|Traditional market|Sūq taqlīdī;قَهْوَةٌ عَرَبِيَّةٌ|Arabic coffee|Qahwa ʿarabiyya;سَفِينَةٌ شِرَاعِيَّةٌ|Sailing ship|Safīna shirāʿiyya'],
 [7,'Reading for detail','وَصَلَ الْقِطَارُ مُبَكِّرًا|The train arrived early|Waṣala l-qiṭāru mubakkiran;لَمْ يَشْتَرِ الْمُسَافِرُ تَذْكِرَةً|The traveller did not buy a ticket|Lam yashtari l-musāfiru tadhkira;كَانَ الطَّقْسُ غَائِمًا|The weather was cloudy|Kāna ṭ-ṭaqsu ghāʾiman'],
 [7,'Connecting ideas','بِالرَّغْمِ مِنَ الْمَطَرِ|Despite the rain|Bir-raghmi mina l-maṭar;عَلَى سَبِيلِ الْمِثَالِ|For example|ʿAlā sabīli l-mithāl;مِنْ نَاحِيَةٍ أُخْرَى|On the other hand|Min nāḥiyatin ukhrā']
];
const alphabet = Array.from({length:7},(_,i)=>[0,i===0?'Meet your first letters':'Letters '+(i*4+1)+'–'+(i*4+4),letters.slice(i*4,i*4+4).map((letter,j)=>[letter,names[i*4+j],names[i*4+j]].join('|')).join(';')]);
export const lessons = [...alphabet,...groups,...additionalLessons].map(([world,title,source],id)=>({id:'l'+id,world,title,items:(source+(extensions[title]?';'+extensions[title]:'')).split(';').map((line,i)=>{const [ar,en,say]=line.split('|');return {id:'w'+id+'-'+i,ar,en,say};})}));
export const games = [
 ['Word Match','Match Arabic with its English meaning.','◈'],['Memory Palace','Find matching cards by turning them over.','▦'],['Balloon Pop','Choose the balloon with the right answer.','◉'],['Letter Builder','Arrange Arabic letters in reading order.','أ'],['Listen and Choose','Identify the Arabic word you hear.','♫'],['Sentence Puzzle','Rebuild an Arabic phrase word by word.','▤'],['Desert Dash','Help Noor cross the desert by answering questions.','☀'],['Treasure Hunt','Follow vocabulary clues to the treasure.','◇'],['Writing Wizard','Trace Arabic on a canvas and review your work.','✎'],['Arabic Detective','Choose the right word to replace an incorrect one.','⌕'],['Conversation Quest','Choose a reply in a guided conversation.','☏'],['Boss Battle','Review a world and unlock the next stop.','♜']
];
export const scenes = [
 ['Meeting a new friend','السَّلَامُ عَلَيْكُمْ','وَعَلَيْكُمُ السَّلَامُ'],
 ['At the supermarket','مَاذَا تُرِيدُ؟','أُرِيدُ تُفَّاحَةً'],
 ['At school','مَا اسْمُكَ؟','اسْمِي نُورٌ'],
 ['At a restaurant','مَاذَا تُرِيدُ أَنْ تَشْرَبَ؟','أُرِيدُ مَاءً'],
 ['Visiting Abu Dhabi','مَا عَاصِمَةُ الْإِمَارَاتِ؟','أَبُو ظَبْيٍ'],
 ['Asking for directions','أَيْنَ أَذْهَبُ؟','اِذْهَبْ يَمِينًا'],
 ['Talking about family','هَلْ عِنْدَكَ أَخٌ؟','نَعَمْ، عِنْدِي أَخٌ'], ...additionalScenes
];
export const ranks = ['Arabic Explorer','Letter Adventurer','Word Warrior','Sentence Builder','Conversation Champion','Grammar Guardian','Arabic Hero','Language Master'];
export const cosmetics = [['Desert explorer',15,'🧭'],['Star traveller',25,'🚀'],['Golden crown',35,'👑'],['Adventure hat',10,'🎩'],['Purple glasses',12,'👓'],['Moonlit frame',20,'🌙'],['Oasis backdrop',30,'🌴'],['Amber scarf',18,'🧣']];
export const alphabetLetters = letters;


