const fs = require('fs');
const { Client } = require('pg');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envLocal.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=').slice(1).join('=').trim().replace(/['"]/g, '');

const client = new Client({ connectionString: dbUrl });

async function run() {
  await client.connect();
  try {
    const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='conversations'");
    console.log('Conversations columns:', r.rows.map(x => x.column_name).join(', '));
    
    // Also test inserting a conversation to check if it works
    const convTest = await client.query("SELECT COUNT(*) FROM conversations");
    console.log('Total conversations:', convTest.rows[0].count);
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}
run();
