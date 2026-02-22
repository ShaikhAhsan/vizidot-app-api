const { sequelize } = require('../config/database');
const { Product } = require('../models');

async function migrateToSingleImage() {
  try {
    console.log('🔄 Starting migration to single image fields...');
    
    // Add new columns if they don't exist
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS image VARCHAR(500) NULL COMMENT 'Main product image URL',
      ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500) NULL COMMENT 'Product thumbnail image URL'
    `);
    
    console.log('✅ Added new image and thumbnail columns');
    
    // Get all products with existing images
    const products = await Product.findAll({
      where: {
        images: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    });
    
    console.log(`📦 Found ${products.length} products with existing images`);
    
    // Migrate existing images to single image fields
    for (const product of products) {
      if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        
        // Extract image URLs based on the structure
        let imageUrl = null;
        let thumbnailUrl = null;
        
        if (typeof firstImage === 'string') {
          imageUrl = firstImage;
          thumbnailUrl = firstImage;
        } else if (typeof firstImage === 'object') {
          imageUrl = firstImage.url || firstImage.original;
          thumbnailUrl = firstImage.thumbnailUrl || firstImage.thumbnail || imageUrl;
        }
        
        // Update the product with single image fields
        await product.update({
          image: imageUrl,
          thumbnail: thumbnailUrl
        });
        
        console.log(`✅ Migrated product ${product.id}: ${product.name}`);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('📝 You can now remove the old images column if desired');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToSingleImage();
}

module.exports = migrateToSingleImage;
