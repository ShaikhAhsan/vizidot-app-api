const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'For guest users'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  applied_coupon_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  delivery_address: {
    type: DataTypes.JSON,
    allowNull: true
  },
  delivery_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  delivery_type: {
    type: DataTypes.ENUM('quick', 'convenience', 'next_day'),
    allowNull: true,
    defaultValue: 'convenience'
  },
  is_abandoned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  abandoned_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Cart expiration time'
  }
}, {
  tableName: 'carts',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['session_id']
    },
    {
      fields: ['is_abandoned']
    },
    {
      fields: ['expires_at']
    }
  ]
});

// Instance methods
Cart.prototype.calculateTotals = async function() {
  const { CartItem } = require('./index');
  
  const items = await CartItem.findAll({
    where: { cart_id: this.id },
    include: ['product']
  });
  
  let subtotal = 0;
  let totalItems = 0;
  
  for (const item of items) {
    subtotal += item.product.price * item.quantity;
    totalItems += item.quantity;
  }
  
  this.subtotal = subtotal;
  
  // Calculate delivery fee (this would be based on business rules)
  this.delivery_fee = this.calculateDeliveryFee();
  
  // Calculate tax (this would be based on business rules)
  this.tax_amount = this.calculateTax();
  
  // Calculate total
  this.total_amount = this.subtotal + this.delivery_fee + this.tax_amount - this.discount_amount;
  
  await this.save();
  
  return {
    subtotal: this.subtotal,
    delivery_fee: this.delivery_fee,
    tax_amount: this.tax_amount,
    discount_amount: this.discount_amount,
    total_amount: this.total_amount,
    total_items: totalItems
  };
};

Cart.prototype.calculateDeliveryFee = function() {
  // This would be implemented based on business delivery rules
  // For now, return a simple calculation
  if (this.subtotal >= 1000) {
    return 0; // Free delivery over 1000
  }
  return 50; // Default delivery fee
};

Cart.prototype.calculateTax = function() {
  // This would be implemented based on tax rules
  // For now, return 5% tax
  return this.subtotal * 0.05;
};

Cart.prototype.isExpired = function() {
  if (!this.expires_at) return false;
  return new Date() > this.expires_at;
};

Cart.prototype.markAsAbandoned = async function() {
  this.is_abandoned = true;
  this.abandoned_at = new Date();
  await this.save();
};

Cart.prototype.getTotalItems = async function() {
  const { CartItem } = require('./index');
  const result = await CartItem.findOne({
    where: { cart_id: this.id },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total']
    ],
    raw: true
  });
  
  return parseInt(result.total) || 0;
};

// Hooks
Cart.beforeCreate(async (cart) => {
  // Set expiration time (7 days from now)
  cart.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
});

module.exports = Cart;

