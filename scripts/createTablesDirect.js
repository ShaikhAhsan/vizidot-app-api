require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function createTables() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error('Set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD in .env (copy from env.example)');
  }
  const dbConfig = {
    host: DB_HOST,
    port: parseInt(DB_PORT || '3306', 10),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true
  };

  console.log(`🔌 Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`);
  
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('🔌 Connected to database successfully');

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'createLoginTables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Creating tables...');
    await connection.query(sql);
    console.log('✅ Tables created successfully!');

    // Verify tables were created
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('users', 'roles', 'user_roles')
    `, [process.env.DB_NAME]);

    console.log('\n📊 Created tables:');
    tables.forEach(table => {
      console.log(`   ✓ ${table.TABLE_NAME}`);
    });

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n🔌 Connection closed');
  }
}

if (require.main === module) {
  createTables()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = createTables;

