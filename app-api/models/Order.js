const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
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
  order_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  order_status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  subtotal_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
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
    validate: {
      min: 0
    }
  },
  delivery_type: {
    type: DataTypes.ENUM('quick', 'convenience', 'next_day'),
    allowNull: false,
    defaultValue: 'convenience'
  },
  delivery_address: {
    type: DataTypes.JSON,
    allowNull: false
  },
  delivery_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  delivery_eta: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actual_delivery_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  customer_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  payment_method: {
    type: DataTypes.ENUM('cash_on_delivery', 'credit_card', 'debit_card', 'bank_transfer', 'wallet'),
    allowNull: true
  },
  payment_reference: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  coupon_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  coupon_discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  tracking_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estimated_preparation_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated preparation time in minutes'
  },
  actual_preparation_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Actual preparation time in minutes'
  },
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Delivery driver ID'
  },
  driver_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  refund_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'orders',
  indexes: [
    {
      unique: true,
      fields: ['order_number']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['order_status']
    },
    {
      fields: ['payment_status']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Order.prototype.generateOrderNumber = function() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `ORD-${timestamp.slice(-6)}-${random}`;
};

Order.prototype.canBeCancelled = function() {
  const cancellableStatuses = ['pending', 'confirmed'];
  return cancellableStatuses.includes(this.order_status);
};

Order.prototype.canBeRefunded = function() {
  return this.order_status === 'delivered' && this.payment_status === 'paid';
};

Order.prototype.getEstimatedDeliveryTime = function() {
  if (this.actual_delivery_time) {
    return this.actual_delivery_time;
  }
  return this.delivery_eta;
};

Order.prototype.getTotalItems = async function() {
  const { OrderItem } = require('./index');
  const items = await OrderItem.findAll({
    where: { order_id: this.id }
  });
  return items.reduce((total, item) => total + item.quantity, 0);
};

// Hooks
Order.beforeCreate(async (order) => {
  if (!order.order_number) {
    order.order_number = order.generateOrderNumber();
  }
});

module.exports = Order;

