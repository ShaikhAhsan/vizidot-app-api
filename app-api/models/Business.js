const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Business = sequelize.define('Business', {
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
  business_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  business_slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  banner_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  primary_color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#007bff'
  },
  secondary_color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#6c757d'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  country_code: {
    type: DataTypes.STRING(5),
    allowNull: true,
    defaultValue: '+92',
    comment: 'Country code for contact phone'
  },
  contact_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  delivery_radius: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 10,
    comment: 'Delivery radius in kilometers'
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  min_order_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
  business_type: {
    type: DataTypes.ENUM('grocery', 'restaurant', 'pharmacy', 'electronics', 'clothing', 'other'),
    allowNull: false,
    defaultValue: 'grocery'
  },
  payment_methods: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: ['cash_on_delivery', 'credit_card']
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp (legacy)'
  },
  is_delete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Soft delete flag'
  }
}, {
  tableName: 'businesses',
  indexes: [
    {
      unique: true,
      fields: ['business_slug']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_verified']
    },
    {
      fields: ['business_type']
    },
    {
      fields: ['deleted_at']
    },
    {
      fields: ['is_delete']
    }
  ],
  paranoid: false
});

// Instance methods
Business.prototype.getFullAddress = function() {
  return this.address || 'Address not provided';
};

Business.prototype.isOpen = async function() {
  const { BusinessTiming } = require('./index');
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  
  const timing = await BusinessTiming.findOne({
    where: {
      business_id: this.id,
      day_of_week: dayOfWeek,
      is_closed: false
    }
  });
  
  if (!timing) return false;
  
  return currentTime >= timing.opening_time && currentTime <= timing.closing_time;
};

module.exports = Business;

