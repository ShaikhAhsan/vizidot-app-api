const { sequelize } = require('../config/database');
const { Product, ProductCategory } = require('../models');
const { Op } = require('sequelize');

async function migrateToProductCategories() {
  try {
    console.log('🔄 Starting migration to product_categories table...');

    // 1. Get all products that have a category_id
    const productsWithCategories = await Product.findAll({
      where: {
        category_id: {
          [Op.ne]: null
        }
      }
    });

    console.log(`📦 Found ${productsWithCategories.length} products with existing categories`);

    // 2. Create product_categories entries for each product
    for (const product of productsWithCategories) {
      if (product.category_id) {
        // Check if the relationship already exists
        const existingRelation = await ProductCategory.findOne({
          where: {
            product_id: product.id,
            category_id: product.category_id
          }
        });

        if (!existingRelation) {
          await ProductCategory.create({
            product_id: product.id,
            category_id: product.category_id,
            is_primary: true, // Mark the existing category as primary
            sort_order: 0
          });
          console.log(`✅ Migrated product ${product.id} to category ${product.category_id}`);
        } else {
          console.log(`ℹ️  Product ${product.id} already has category ${product.category_id}`);
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📝 You can now remove the old category_id column if desired');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToProductCategories();
}

module.exports = migrateToProductCategories;
