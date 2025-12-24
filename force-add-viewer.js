const { Client } = require('pg');
require('dotenv').config();

async function forceAddViewer() {
  // Connect as postgres superuser
  const superClient = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: 'postgres', // Use superuser
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'movie_db',
  });

  try {
    await superClient.connect();
    console.log('✅ Connected as postgres superuser\n');

    // Check current enum values
    const checkQuery = `
      SELECT enumlabel as role
      FROM pg_enum
      WHERE enumtypid = (
        SELECT oid
        FROM pg_type
        WHERE typname = 'users_role_enum'
      )
      ORDER BY enumsortorder;
    `;

    console.log('📋 Current enum values:');
    const beforeResult = await superClient.query(checkQuery);
    beforeResult.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.role}`);
    });

    const hasViewer = beforeResult.rows.some(row => row.role === 'viewer');

    if (!hasViewer) {
      console.log('\n⚠️  VIEWER not found. Adding now...');

      // Try to add with transaction
      await superClient.query('BEGIN');
      try {
        await superClient.query(`ALTER TYPE users_role_enum ADD VALUE 'viewer'`);
        await superClient.query('COMMIT');
        console.log('✅ Successfully added VIEWER to enum');
      } catch (error) {
        await superClient.query('ROLLBACK');
        if (error.message.includes('already exists')) {
          console.log('✅ VIEWER already exists (concurrent add)');
        } else {
          throw error;
        }
      }
    } else {
      console.log('\n✅ VIEWER already exists in enum');
    }

    // Verify again
    console.log('\n📋 Final enum values:');
    const afterResult = await superClient.query(checkQuery);
    afterResult.rows.forEach((row, idx) => {
      const icon = row.role === 'viewer' ? '✅' : '  ';
      console.log(`${icon} ${idx + 1}. ${row.role}`);
    });

    // Force TypeORM to reload by checking a test query
    console.log('\n🧪 Testing enum with INSERT query...');

    // Create a test to see if enum accepts 'viewer'
    const testQuery = `
      SELECT 'viewer'::users_role_enum as test;
    `;

    try {
      const testResult = await superClient.query(testQuery);
      console.log(`✅ Database accepts 'viewer' enum: ${testResult.rows[0].test}`);
    } catch (error) {
      console.log(`❌ Database still rejects 'viewer': ${error.message}`);
    }

    await superClient.end();

    console.log('\n🔄 Next: Restart backend completely');
    console.log('   pm2 delete movie-backend && pm2 start ecosystem.config.js');
    console.log('   OR just: pm2 restart movie-backend --update-env');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await superClient.end();
    process.exit(1);
  }
}

forceAddViewer();
