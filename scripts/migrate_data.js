const { Client } = require('pg');

const localString = "postgresql://postgres:123456@localhost:5432/interax";
const remoteString = "postgresql://neondb_owner:npg_X0lOUZPDayM3@ep-lingering-night-apknt5ma-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Correct order to avoid foreign key constraint violations
const tables = [
  'users',
  'groups',
  'pages',
  'group_members',
  'page_followers',
  'follows',
  'posts',
  'post_comments',
  'post_likes',
  'post_ratings',
  'stories',
  'story_reactions',
  'notifications',
  'conversations',
  'messages',
  'message_reactions',
  'ai_chatbot_sessions',
  'ai_chatbot_messages',
  'uploads'
];

async function migrateData() {
  const localDb = new Client({ connectionString: localString });
  const remoteDb = new Client({ connectionString: remoteString });

  try {
    await localDb.connect();
    console.log("✅ Connected to Local DB.");
    await remoteDb.connect();
    console.log("✅ Connected to Remote DB.");

    // Clean target tables in reverse order to respect foreign keys
    for (const table of [...tables].reverse()) {
      console.log(`Clearing remote table: ${table}...`);
      await remoteDb.query(`DELETE FROM ${table};`);
    }

    for (const table of tables) {
      console.log(`\nFetching data from local ${table}...`);
      const res = await localDb.query(`SELECT * FROM ${table}`);
      const rows = res.rows;
      
      if (rows.length === 0) {
        console.log(`No data to migrate for ${table}.`);
        continue;
      }

      console.log(`Found ${rows.length} rows in ${table}. Migrating...`);
      
      const columns = Object.keys(rows[0]);
      
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
        `;
        
        await remoteDb.query(query, values);
      }
      console.log(`✅ Migrated ${rows.length} rows to ${table}.`);
    }

    console.log("\n🎉 Database content successfully migrated to Neon!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await localDb.end();
    await remoteDb.end();
  }
}

migrateData();
