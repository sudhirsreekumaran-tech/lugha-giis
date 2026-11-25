import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { postgresSql } from '../postgres.mjs';

test('PostgreSQL migration is repeatable, isolates learner data and supports application queries',async()=>{
 const db=new PGlite();
 try{
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);');
  const migration=await readFile(new URL('../supabase/migrations/202611250001_lugha.sql',import.meta.url),'utf8');
  await db.exec(migration);
  await db.exec(migration);
  await db.exec('SET search_path TO lugha, pg_catalog;');
  await db.query(postgresSql('INSERT OR IGNORE INTO content VALUES(?,?)'),['l0','{}']);
  await db.query(postgresSql('INSERT OR IGNORE INTO content VALUES(?,?)'),['l0','{"different":true}']);
  await db.query(postgresSql('INSERT OR IGNORE INTO content VALUES(?,?)'),['l1','{"different":true}']);
  const seeded=await db.query(postgresSql('SELECT data FROM content ORDER BY rowid'));
  assert.deepEqual(seeded.rows.map(x=>x.data),['{}','{"different":true}']);
  await db.query("INSERT INTO users(id,email,role,profile) VALUES('test-student','x@example.test','student','{}')");
  await assert.rejects(db.query("INSERT INTO users(id,email,password,role,profile) VALUES('bad','b@example.test','x','student','{}')"),/check constraint/);
  await assert.rejects(db.query("INSERT INTO users(id,email,role,profile) VALUES('bad','b@example.test','owner','{}')"),/check constraint/);
  const protections=await db.query(`SELECT relrowsecurity, has_table_privilege('anon', c.oid, 'SELECT') AS anon_read,
   has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_read
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='lugha' AND c.relkind='r'`);
  assert.ok(protections.rows.length>=15);
  assert.ok(protections.rows.every(row=>row.relrowsecurity&&!row.anon_read&&!row.authenticated_read));
  await db.exec('SET ROLE authenticated;');
  await assert.rejects(db.query('SELECT * FROM lugha.users'),/permission denied/);
 }finally{await db.close();}
});
