const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.ysspdumydtjzjkunkyak:InteraX2026!Secure@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
  });
  await client.connect();
  
  console.log('--- LATEST STORIES ---');
  const stories = await client.query('SELECT * FROM stories ORDER BY created_at DESC LIMIT 5');
  console.log(stories.rows);

  console.log('--- STORIES VIEWS ---');
  const storyViews = await client.query('SELECT * FROM story_views LIMIT 5');
  console.log(storyViews.rows);

  console.log('--- LATEST POSTS ---');
  const posts = await client.query('SELECT * FROM posts ORDER BY created_at DESC LIMIT 5');
  console.log(posts.rows);

  console.log('--- POST LIKES / REACTIONS ---');
  const postLikes = await client.query('SELECT * FROM post_likes LIMIT 5');
  console.log(postLikes.rows);

  await client.end();
}

main().catch(console.error);
