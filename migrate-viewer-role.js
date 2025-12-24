const { Client } = require('pg');
require('dotenv').config();

async function addViewerRole() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'movie_db',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if 'viewer' already exists in enum
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'viewer'
        AND enumtypid = (
          SELECT oid
          FROM pg_type
          WHERE typname = 'users_role_enum'
        )
      ) as exists;
    `;

    const checkResult = await client.query(checkQuery);

    if (checkResult.rows[0].exists) {
      console.log('✅ VIEWER role already exists in database enum');
    } else {
      console.log('Adding VIEWER to users_role_enum...');
      await client.query("ALTER TYPE users_role_enum ADD VALUE 'viewer'");
      console.log('✅ Successfully added VIEWER role to database enum');
    }

    await client.end();
    console.log('Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

addViewerRole();
