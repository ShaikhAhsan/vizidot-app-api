const { sequelize } = require('../config/database');

async function createTables() {
  try {
    console.log('Creating Brand and Tags tables...');

    // Create brands table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        image VARCHAR(255),
        brand_slider_image VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_brands_slug (slug),
        INDEX idx_brands_active (is_active),
        INDEX idx_brands_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create tags table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#007bff',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_tags_name (name),
        INDEX idx_tags_active (is_active),
        INDEX idx_tags_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create product_tags junction table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        tag_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_product_tag (product_id, tag_id),
        INDEX idx_product_tags_product (product_id),
        INDEX idx_product_tags_tag (tag_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Add brand_id column to products table if it doesn't exist
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS brand_id INT NULL,
      ADD INDEX IF NOT EXISTS idx_products_brand (brand_id),
      ADD FOREIGN KEY IF NOT EXISTS fk_products_brand (brand_id) REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    console.log('✅ Brand and Tags tables created successfully!');
    
    // Insert some sample brands
    await sequelize.query(`
      INSERT IGNORE INTO brands (name, slug, description, is_active) VALUES
      ('Nestle', 'nestle', 'Swiss multinational food and drink processing conglomerate', true),
      ('Unilever', 'unilever', 'British-Dutch multinational consumer goods company', true),
      ('P&G', 'pandg', 'American multinational consumer goods corporation', true),
      ('Colgate', 'colgate', 'American multinational consumer products company', true),
      ('Dove', 'dove', 'Personal care brand owned by Unilever', true),
      ('Lipton', 'lipton', 'British brand of tea owned by Unilever', true),
      ('Knorr', 'knorr', 'Food and beverage brand owned by Unilever', true),
      ('Lifebuoy', 'lifebuoy', 'Soap brand owned by Unilever', true),
      ('Sunsilk', 'sunsilk', 'Hair care brand owned by Unilever', true),
      ('Clear', 'clear', 'Anti-dandruff shampoo brand owned by Unilever', true);
    `);

    // Insert some sample tags
    await sequelize.query(`
      INSERT IGNORE INTO tags (name, description, color, is_active) VALUES
      ('Organic', 'Products made with organic ingredients', '#28a745', true),
      ('Gluten Free', 'Products that do not contain gluten', '#17a2b8', true),
      ('Dairy Free', 'Products that do not contain dairy', '#ffc107', true),
      ('Vegan', 'Products suitable for vegans', '#6f42c1', true),
      ('Low Sugar', 'Products with reduced sugar content', '#fd7e14', true),
      ('High Protein', 'Products with high protein content', '#e83e8c', true),
      ('Fresh', 'Fresh products', '#20c997', true),
      ('Premium', 'Premium quality products', '#6c757d', true),
      ('Local', 'Locally sourced products', '#007bff', true),
      ('Imported', 'Imported products', '#dc3545', true);
    `);

    console.log('✅ Sample brands and tags inserted successfully!');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await sequelize.close();
  }
}

createTables();
