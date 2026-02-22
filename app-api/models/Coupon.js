const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  coupon_type: {
    type: DataTypes.ENUM('percentage', 'fixed_amount', 'free_delivery', 'buy_x_get_y'),
    allowNull: false,
    defaultValue: 'percentage'
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  max_discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  min_order_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  usage_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Total usage limit across all users'
  },
  usage_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  used_by_user_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Usage limit per user'
  },
  valid_from: {
    type: DataTypes.DATE,
    allowNull: false
  },
  valid_until: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.ENUM('admin', 'business'),
    allowNull: false,
    defaultValue: 'admin'
  },
  creator_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of admin or business who created the coupon'
  },
  scope_type: {
    type: DataTypes.ENUM('global', 'business', 'category', 'product'),
    allowNull: false,
    defaultValue: 'global'
  },
  scope_ids: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of IDs based on scope_type'
  },
  stackable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Higher number = higher priority'
  },
  auto_apply: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  conditions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional conditions for coupon application'
  },
  terms_and_conditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_delete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'coupons',
  indexes: [
    {
      unique: true,
      fields: ['code']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['valid_from', 'valid_until']
    },
    {
      fields: ['created_by', 'creator_id']
    },
    {
      fields: ['scope_type']
    },
    {
      fields: ['is_delete']
    }
  ]
});

// Instance methods
Coupon.prototype.isValid = function() {
  const now = new Date();
  return this.is_active && 
         now >= this.valid_from && 
         now <= this.valid_until &&
         (this.usage_limit === null || this.usage_count < this.usage_limit);
};

Coupon.prototype.canBeUsedByUser = function(userId) {
  // This would need to be implemented with a separate usage tracking table
  // For now, we'll assume it can be used if the coupon is valid
  return this.isValid();
};

Coupon.prototype.calculateDiscount = function(orderAmount) {
  if (!this.isValid() || orderAmount < (this.min_order_amount || 0)) {
    return 0;
  }

  let discount = 0;

  switch (this.coupon_type) {
    case 'percentage':
      discount = (orderAmount * this.discount_value) / 100;
      if (this.max_discount_amount && discount > this.max_discount_amount) {
        discount = this.max_discount_amount;
      }
      break;
    case 'fixed_amount':
      discount = this.discount_value;
      break;
    case 'free_delivery':
      // This would be handled separately in delivery fee calculation
      discount = 0;
      break;
    case 'buy_x_get_y':
      // This would need more complex logic based on conditions
      discount = 0;
      break;
  }

  return Math.min(discount, orderAmount);
};

Coupon.prototype.incrementUsage = async function() {
  this.usage_count += 1;
  await this.save();
};

module.exports = Coupon;

