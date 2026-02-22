const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'brands',
      key: 'id'
    }
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  short_description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  old_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  cost_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  stock_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  min_stock_alert: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  max_quantity_per_order: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Main product image URL'
  },
  thumbnail: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Product thumbnail image URL'
  },
  brand_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'piece'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_digital: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  requires_prescription: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  total_reviews: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  total_sales: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  meta_title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  meta_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attributes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  is_delete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Soft delete flag'
  }
}, {
  tableName: 'products',
  indexes: [
    {
      unique: true,
      fields: ['business_id', 'slug']
    },
    {
      unique: true,
      fields: ['sku']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['brand_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_featured']
    },
    {
      fields: ['price']
    },
    {
      fields: ['rating']
    },
    {
      fields: ['is_delete']
    }
  ]
});

// Instance methods
Product.prototype.isInStock = function() {
  return this.stock_quantity > 0;
};

Product.prototype.isLowStock = function() {
  return this.stock_quantity <= this.min_stock_alert;
};

Product.prototype.getDiscountPercentage = function() {
  if (!this.old_price || this.old_price <= this.price) return 0;
  return Math.round(((this.old_price - this.price) / this.old_price) * 100);
};

Product.prototype.getMainImage = function() {
  return this.image || null;
};

Product.prototype.getThumbnail = function() {
  return this.thumbnail || this.image || null;
};

Product.prototype.updateStock = async function(quantity, operation = 'subtract') {
  if (operation === 'subtract') {
    this.stock_quantity = Math.max(0, this.stock_quantity - quantity);
  } else if (operation === 'add') {
    this.stock_quantity += quantity;
  }
  
  await this.save();
  return this.stock_quantity;
};

module.exports = Product;

