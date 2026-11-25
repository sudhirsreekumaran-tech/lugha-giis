import { one, query, run, transact } from './database.mjs';

export const schoolSchema=`
 CREATE TABLE IF NOT EXISTS school_students(
  uid TEXT PRIMARY KEY REFERENCES users(id),external_id TEXT UNIQUE,grade TEXT,
  learner_level TEXT,support TEXT NOT NULL DEFAULT '{}'
 );
 CREATE TABLE IF NOT EXISTS parent_links(
  parent TEXT NOT NULL REFERENCES users(id),student TEXT NOT NULL REFERENCES school_students(uid),
  PRIMARY KEY(parent,student)
 );
 CREATE TABLE IF NOT EXISTS learning_journeys(
  run_id TEXT PRIMARY KEY REFERENCES arcade_runs(id),uid TEXT NOT NULL REFERENCES users(id),
  lesson TEXT NOT NULL,score INTEGER,accuracy INTEGER,completed_at TEXT
 );
`;

const levels=['Complete Beginner','Beginner','Intermediate','Advanced'];
export async function effectiveProfile(user){
 const profile=JSON.parse(user.profile);
 const record=user.role==='student'?await one('SELECT grade,learner_level,support FROM school_students WHERE uid=?',user.id):null;
 if(!record)return profile;
 const supports=JSON.parse(record.support);
 return {
  ...profile,
  level:levels.includes(record.learner_level)?record.learner_level:profile.level,
  english:Math.max(profile.english,supports.largeText===true?120:100),
  arabic:Math.max(profile.arabic,supports.largeText===true?125:100),
  motion:profile.motion||supports.reducedMotion===true,
  audioInstructions:profile.audioInstructions||supports.audioInstructions===true,
  simplified:profile.simplified||supports.shortSteps===true,
  schoolAssist:supports.untimed===true
 };
}
export async function linkedChildren(parent){
 const linked=await query(`SELECT u.id,u.profile,s.grade FROM parent_links l JOIN users u ON u.id=l.student
 JOIN school_students s ON s.uid=u.id WHERE l.parent=? AND u.role='student' ORDER BY u.id`,parent);
 return Promise.all(linked.map(async child=>{
  const display=JSON.parse(child.profile);
  const counts=await one(`SELECT COUNT(CASE WHEN kind='lesson' THEN 1 END) AS lessons,
  COUNT(CASE WHEN kind='video' THEN 1 END) AS videos,
  COALESCE(SUM(xp),0) AS xp FROM activity WHERE uid=?`,child.id);
  const games=await query('SELECT game,score,accuracy FROM arcade_bests WHERE uid=? ORDER BY score DESC',child.id);
  const needsPractice=await one('SELECT COUNT(*) AS count FROM mastery WHERE uid=? AND misses>hits',child.id);
  return {id:child.id,name:display.name,grade:child.grade,...counts,games,recommendation:needsPractice.count?'Review difficult words and try another practice round.':'Continue with the next lesson and its Arcade challenge.'};
 }));
}
export async function seedSchoolDemo(defaults,passwordHash){
 if(process.env.LUGHA_ENABLE_DEMOS!=='1'||process.env.VERCEL)return;
 if(await one("SELECT 1 FROM users WHERE id='demo-teacher'"))return;
 const password=passwordHash('LughaDemo2026!');
 await transact(async()=>{
  const accounts=[
   ['demo-student','student','Amina (fictional)'],
   ['demo-second','student2','Kareem (fictional)'],
   ['demo-parent','parent','Demo parent'],
   ['demo-teacher','teacher','Demo teacher']
  ];
  for(const [uid,account,name] of accounts){
   const role=account==='student2'?'student':account;
   await run('INSERT OR IGNORE INTO users VALUES(?,?,?,?,?)',uid,account+'@lugha.example',password,role,JSON.stringify({...defaults,name,onboarded:true}));
  }
  await run('INSERT OR IGNORE INTO school_students VALUES(?,?,?,?,?)','demo-student','fiction-A','Grade 5','Beginner',JSON.stringify({largeText:true,reducedMotion:true,shortSteps:true,untimed:true}));
  await run('INSERT OR IGNORE INTO school_students VALUES(?,?,?,?,?)','demo-second','fiction-B','Grade 7','Intermediate','{}');
  for(const uid of ['demo-student','demo-second']){
   await run('INSERT OR IGNORE INTO parent_links VALUES(?,?)','demo-parent',uid);
   await run('INSERT OR IGNORE INTO classrooms VALUES(?,?,?,0)','DEMOCLASS','demo-teacher','Fictional Arabic class');
   await run('INSERT OR IGNORE INTO members VALUES(?,?)','DEMOCLASS',uid);
  }
 });
}
