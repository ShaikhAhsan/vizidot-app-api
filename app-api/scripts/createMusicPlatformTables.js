const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createMusicPlatformTables() {
  try {
    console.log('🔄 Creating music platform tables...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'createMusicPlatformTables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the entire SQL script
    // Remove comments and split by semicolon, but keep CREATE TABLE statements together
    const cleanedSql = sql
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/--.*$/gm, '') // Remove line comments
      .trim();
    
    // Split by semicolon but keep CREATE TABLE statements intact
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.toUpperCase().includes('CREATE'));
    
    console.log(`📝 Found ${statements.length} CREATE TABLE statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      try {
        console.log(`Creating table ${i + 1}/${statements.length}...`);
        await sequelize.query(statement);
        console.log(`✅ Table ${i + 1} created`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Table ${i + 1} already exists, skipping`);
        } else {
          console.error(`❌ Error creating table ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Music platform tables created successfully!');
    
    // Verify tables were created
    const [results] = await sequelize.query("SHOW TABLES");
    const tableNames = results.map(r => Object.values(r)[0]);
    console.log('\n📊 Tables in database:');
    tableNames.forEach(name => console.log(`  - ${name}`));
    
    const musicTables = ['artists', 'artist_brandings', 'artist_shops', 'albums', 'audio_tracks', 'video_tracks', 'album_artists', 'track_artists'];
    const createdTables = musicTables.filter(t => tableNames.includes(t));
    
    console.log(`\n✅ Music platform tables created: ${createdTables.length}/${musicTables.length}`);
    if (createdTables.length < musicTables.length) {
      const missing = musicTables.filter(t => !tableNames.includes(t));
      console.log(`⚠️  Missing tables: ${missing.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating music platform tables:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createMusicPlatformTables()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createMusicPlatformTables;

