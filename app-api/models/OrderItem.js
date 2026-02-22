const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  product_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Snapshot of product name at time of order'
  },
  product_sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Snapshot of product SKU at time of order'
  },
  product_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Snapshot of product price at time of order'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'product_price * quantity'
  },
  applied_discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  final_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'total_price - applied_discount'
  },
  product_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Snapshot of product image at time of order'
  },
  product_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Snapshot of product description at time of order'
  },
  product_weight: {
    type: DataTypes.DECIMAL(8, 3),
    allowNull: true,
    comment: 'Snapshot of product weight at time of order'
  },
  product_unit: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Snapshot of product unit at time of order'
  },
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_fulfilled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  fulfillment_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'order_items',
  indexes: [
    {
      fields: ['order_id']
    },
    {
      fields: ['product_id']
    }
  ]
});

// Instance methods
OrderItem.prototype.getTotalWeight = function() {
  if (!this.product_weight) return 0;
  return this.product_weight * this.quantity;
};

OrderItem.prototype.calculateFinalPrice = function() {
  this.final_price = this.total_price - this.applied_discount;
  return this.final_price;
};

// Hooks
OrderItem.beforeCreate(async (orderItem) => {
  // Calculate total price
  orderItem.total_price = orderItem.product_price * orderItem.quantity;
  
  // Calculate final price
  orderItem.calculateFinalPrice();
});

OrderItem.beforeUpdate(async (orderItem) => {
  // Recalculate if price or discount changed
  if (orderItem.changed('product_price') || orderItem.changed('quantity')) {
    orderItem.total_price = orderItem.product_price * orderItem.quantity;
  }
  
  if (orderItem.changed('total_price') || orderItem.changed('applied_discount')) {
    orderItem.calculateFinalPrice();
  }
});

module.exports = OrderItem;

