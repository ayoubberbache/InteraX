const fs = require('fs');
const { Client } = require('pg');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envLocal.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=').slice(1).join('=').trim().replace(/['"]/g, '');

const client = new Client({ connectionString: dbUrl });

async function run() {
  await client.connect();
  try {
    const tables = ['polls', 'poll_options', 'poll_votes', 'events'];
    for (const t of tables) {
      const exists = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [t]);
      console.log(`Table ${t} exists:`, exists.rows[0].exists);
      if (exists.rows[0].exists) {
        const columns = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [t]);
        console.log(`Columns of ${t}:`, columns.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
      }
    }
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}
run();
