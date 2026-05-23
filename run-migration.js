const fs = require('fs');
const { Client } = require('pg');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envLocal.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=').slice(1).join('=').trim().replace(/['"]/g, '');

const client = new Client({ connectionString: dbUrl });

async function run() {
  await client.connect();
  try {
    console.log('Reading migration_003.sql...');
    const sql = fs.readFileSync('backend/migration_003.sql', 'utf8');
    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration 003 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}
run();
