const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.ysspdumydtjzjkunkyak:InteraX2026!Secure@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
  });
  await client.connect();
  
  const user = await client.query("SELECT * FROM users WHERE id = '9c011727-c1e0-4b95-a6e2-af1869e4206c'");
  console.log(user.rows);

  await client.end();
}

main().catch(console.error);
