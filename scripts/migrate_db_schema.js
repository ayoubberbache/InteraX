const { Client } = require('pg');

const localString = "postgresql://postgres:123456@localhost:5432/interax";
const remoteString = "postgresql://neondb_owner:npg_X0lOUZPDayM3@ep-lingering-night-apknt5ma-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const queries = [
  `CREATE TABLE IF NOT EXISTS story_views (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id   UUID NOT NULL,
    user_id    UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(story_id, user_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON story_views(user_id);`,
  
  `CREATE TABLE IF NOT EXISTS blocks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);`,
  `CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);`,

  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false;`
];

async function runSchemaMigration() {
  const localDb = new Client({ connectionString: localString });
  const remoteDb = new Client({ connectionString: remoteString });

  console.log("Running local DB migrations...");
  try {
    await localDb.connect();
    for (const q of queries) {
      await localDb.query(q);
    }
    console.log("✅ Local migrations successful!");
  } catch (err) {
    console.warn("⚠️ Local migrations failed (server might not be running locally):", err.message);
  } finally {
    await localDb.end();
  }

  console.log("Running remote Neon DB migrations...");
  try {
    await remoteDb.connect();
    for (const q of queries) {
      await remoteDb.query(q);
    }
    console.log("✅ Remote migrations successful!");
  } catch (err) {
    console.error("❌ Remote migrations failed:", err.message);
  } finally {
    await remoteDb.end();
  }
}

runSchemaMigration();
