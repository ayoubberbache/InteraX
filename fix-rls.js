const { Client } = require('pg');

async function fixStorageRLS() {
  const client = new Client({
    connectionString: "postgresql://postgres:InteraX2026!Secure@db.ysspdumydtjzjkunkyak.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase Postgres to fix RLS...');

    // 1. Give public access to SELECT (just in case)
    await client.query(`
      CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
    `).catch(e => console.log('Policy SELECT might already exist:', e.message));

    // 2. Give public access to INSERT
    await client.query(`
      CREATE POLICY "Public Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');
    `).catch(e => console.log('Policy INSERT might already exist:', e.message));

    // 3. Give public access to UPDATE
    await client.query(`
      CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads');
    `).catch(e => console.log('Policy UPDATE might already exist:', e.message));

    // 4. Give public access to DELETE
    await client.query(`
      CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'uploads');
    `).catch(e => console.log('Policy DELETE might already exist:', e.message));

    console.log('Successfully configured Storage RLS policies for uploads bucket!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixStorageRLS();
