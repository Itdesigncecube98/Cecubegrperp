const { PrismaClient } = require('@prisma/client');

// Old database connection
const oldPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.ocpnoxdnounlqycretfw:cr7juvesewy%40@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

// New database connection
const newPrisma = new PrismaClient();

async function migrateData() {
  try {
    console.log('🔄 Starting data migration...\n');

    // List of models to migrate (order matters for foreign keys)
    const models = [
      'Admin',
      'Employee',
      'Holiday',
      'Location',
      'LocationRequest',
      'Vehicle',
      'Trip',
      'EmployeeDocument',
      'EmailLog',
      'Leave',
      'Announcement',
      'Setting'
    ];

    for (const model of models) {
      try {
        // Fetch all records from old database
        const records = await oldPrisma[model].findMany();
        
        if (records.length === 0) {
          console.log(`✓ ${model}: No records to migrate`);
          continue;
        }

        // Insert records into new database
        for (const record of records) {
          try {
            await newPrisma[model].create({ data: record });
          } catch (e) {
            // Skip duplicates or conflicts
            if (!e.message.includes('Unique constraint')) {
              console.warn(`  Warning: Failed to insert ${model} record:`, e.message);
            }
          }
        }

        console.log(`✓ ${model}: ${records.length} records migrated`);
      } catch (e) {
        console.log(`⚠ ${model}: Skipped (${e.message})`);
      }
    }

    console.log('\n✅ Data migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await oldPrisma.$disconnect();
    await newPrisma.$disconnect();
  }
}

migrateData();
