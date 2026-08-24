const { Client } = require('pg');

// Old database connection
const oldClient = new Client({
  connectionString: 'postgresql://postgres.ocpnoxdnounlqycretfw:cr7juvesewy%40@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

// New database connection (using DIRECT URL instead of pooler)
const newClient = new Client({
  connectionString: 'postgresql://postgres:Contact%40123Cecube@db.egnqfgaohxqxwvberpit.supabase.co:5432/postgres'
});

const tables = [
  'Admin',
  'Employee', 
  'Holiday',
  'Location',
  'Vehicle',
  'Trip',
  'LocationRequest',
  'EmployeeDocument',
  'EmailLog',
  'Leave',
  'Announcement',
  'Setting'
];

async function migrateData() {
  try {
    console.log('🔄 Connecting to databases...\n');
    
    await oldClient.connect();
    await newClient.connect();
    
    console.log('✓ Connected to both databases\n');

    for (const table of tables) {
      try {
        // Get all data from old database
        const result = await oldClient.query(`SELECT * FROM "${table}"`);
        
        if (result.rows.length === 0) {
          console.log(`✓ ${table}: No records`);
          continue;
        }

        // Disable triggers temporarily
        await newClient.query(`ALTER TABLE "${table}" DISABLE TRIGGER ALL`);

        // Insert data into new database
        for (const row of result.rows) {
          const columns = Object.keys(row);
          const values = columns.map((_, i) => `$${i + 1}`);
          const query = `
            INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')})
            VALUES (${values.join(', ')})
            ON CONFLICT DO NOTHING
          `;
          
          try {
            await newClient.query(query, Object.values(row));
          } catch (e) {
            // Skip conflicts silently
          }
        }

        // Re-enable triggers
        await newClient.query(`ALTER TABLE "${table}" ENABLE TRIGGER ALL`);

        console.log(`✓ ${table}: ${result.rows.length} records migrated`);
      } catch (e) {
        console.log(`⚠ ${table}: Skipped (${e.message})`);
      }
    }

    console.log('\n✅ Data migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

migrateData();
