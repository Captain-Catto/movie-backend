const { Client } = require('pg');
require('dotenv').config();

async function checkViewerEnum() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'movie_db',
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get all enum values
    const query = `
      SELECT enumlabel as role
      FROM pg_enum
      WHERE enumtypid = (
        SELECT oid
        FROM pg_type
        WHERE typname = 'users_role_enum'
      )
      ORDER BY enumsortorder;
    `;

    const result = await client.query(query);

    console.log('Current roles in users_role_enum:');
    console.log('─'.repeat(40));
    result.rows.forEach((row, idx) => {
      const icon = row.role === 'viewer' ? '✅' : '  ';
      console.log(`${icon} ${idx + 1}. ${row.role}`);
    });
    console.log('─'.repeat(40));

    const hasViewer = result.rows.some(row => row.role === 'viewer');

    if (hasViewer) {
      console.log('\n✅ VIEWER role EXISTS in database');
      console.log('\n🔄 Next step: Restart backend to reload schema');
      console.log('   Command: pm2 restart movie-backend');
    } else {
      console.log('\n❌ VIEWER role NOT FOUND');
      console.log('\n💡 Run as superuser:');
      console.log('   psql -U postgres -d movie_db');
      console.log('   ALTER TYPE users_role_enum ADD VALUE \'viewer\';');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkViewerEnum();
