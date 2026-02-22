const { sequelize } = require('../config/database');

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    const [results] = await sequelize.query("SHOW TABLES");
    const tableNames = results.map(r => Object.values(r)[0]);
    
    console.log(`📊 Total tables in database: ${tableNames.length}\n`);
    console.log('Tables:');
    tableNames.forEach(name => console.log(`  ✓ ${name}`));
    
    const musicTables = [
      'artists',
      'artist_brandings', 
      'artist_shops',
      'albums',
      'audio_tracks',
      'video_tracks',
      'album_artists',
      'track_artists'
    ];
    
    console.log('\n🎵 Music Platform Tables Status:');
    musicTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });
    
    const missing = musicTables.filter(t => !tableNames.includes(t));
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing ${missing.length} table(s): ${missing.join(', ')}`);
      console.log('\n💡 To create missing tables, run:');
      console.log('   node scripts/createMusicPlatformTables.js');
      console.log('\n   Or execute the SQL file manually:');
      console.log('   scripts/createMusicPlatformTables.sql');
    } else {
      console.log('\n✅ All music platform tables exist!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();

