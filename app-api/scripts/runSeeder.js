const DummyDataSeeder = require('./seedDummyData');

const seeder = new DummyDataSeeder();
seeder.seedAll().then(() => {
  console.log('🎉 Dummy data seeding completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Seeding failed:', error);
  process.exit(1);
});

