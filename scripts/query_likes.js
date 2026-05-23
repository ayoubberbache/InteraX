const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.ysspdumydtjzjkunkyak:InteraX2026!Secure@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
  });
  await client.connect();
  
  const postLikes = await client.query('SELECT * FROM post_likes');
  console.log(postLikes.rows);

  await client.end();
}

main().catch(console.error);
