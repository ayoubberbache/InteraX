const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://neondb_owner:npg_X0lOUZPDayM3@ep-lingering-night-apknt5ma-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function runMigrations() {
  console.log("Connecting to the online database...");
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("✅ Successfully connected to Neon PostgreSQL!");

    const files = [
      '../backend/schema.sql',
      '../backend/migration_001.sql',
      '../backend/migration_002.sql'
    ];

    for (const file of files) {
      const filePath = path.join(__dirname, file);
      console.log(`\nExecuting ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      await client.query(sql);
      console.log(`✅ Successfully executed ${file}`);
    }

    console.log("\n🎉 All database migrations completed successfully! Your online DB is fully set up.");
  } catch (err) {
    console.error("❌ Error during migration:", err);
  } finally {
    await client.end();
  }
}

runMigrations();
