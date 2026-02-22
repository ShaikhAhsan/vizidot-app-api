const { sequelize } = require('../config/database');
const { Unit } = require('../models');

async function seedUnits() {
  try {
    console.log('🔄 Seeding units table...');
    
    const commonUnits = [
      // Weight units
      { name: 'kg', display_name: 'Kilogram', category: 'weight' },
      { name: 'g', display_name: 'Gram', category: 'weight' },
      { name: 'lb', display_name: 'Pound', category: 'weight' },
      { name: 'oz', display_name: 'Ounce', category: 'weight' },
      
      // Volume units
      { name: 'liter', display_name: 'Liter', category: 'volume' },
      { name: 'ml', display_name: 'Milliliter', category: 'volume' },
      { name: 'gallon', display_name: 'Gallon', category: 'volume' },
      { name: 'cup', display_name: 'Cup', category: 'volume' },
      
      // Count units
      { name: 'piece', display_name: 'Piece', category: 'count' },
      { name: 'dozen', display_name: 'Dozen', category: 'count' },
      { name: 'box', display_name: 'Box', category: 'count' },
      { name: 'pack', display_name: 'Pack', category: 'count' },
      { name: 'bundle', display_name: 'Bundle', category: 'count' },
      { name: 'set', display_name: 'Set', category: 'count' },
      
      // Length units
      { name: 'meter', display_name: 'Meter', category: 'length' },
      { name: 'cm', display_name: 'Centimeter', category: 'length' },
      { name: 'inch', display_name: 'Inch', category: 'length' },
      { name: 'foot', display_name: 'Foot', category: 'length' },
      
      // Area units
      { name: 'sqm', display_name: 'Square Meter', category: 'area' },
      { name: 'sqft', display_name: 'Square Foot', category: 'area' },
      
      // Time units
      { name: 'hour', display_name: 'Hour', category: 'time' },
      { name: 'day', display_name: 'Day', category: 'time' },
      { name: 'week', display_name: 'Week', category: 'time' },
      { name: 'month', display_name: 'Month', category: 'time' },
      { name: 'year', display_name: 'Year', category: 'time' }
    ];
    
    for (const unitData of commonUnits) {
      const [unit, created] = await Unit.findOrCreate({
        where: { name: unitData.name },
        defaults: unitData
      });
      
      if (created) {
        console.log(`✅ Created unit: ${unit.name} (${unit.display_name})`);
      } else {
        console.log(`ℹ️  Unit already exists: ${unit.name}`);
      }
    }
    
    console.log('🎉 Units seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedUnits();
}

module.exports = seedUnits;
