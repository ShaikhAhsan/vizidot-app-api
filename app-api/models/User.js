const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firebase_uid: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Firebase Authentication UID'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[\+]?[1-9][\d]{0,15}$/
    }
  },
  country_code: {
    type: DataTypes.STRING(5),
    allowNull: true,
    defaultValue: '+92',
    comment: 'Country code for phone number (e.g., +92, +1)'
  },
  profile_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  primary_role: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Primary role name for quick access (deprecated - use user_roles table)'
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
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  address: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp (legacy)'
  },
  is_delete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_onboarded: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'True after user completes categories + artists onboarding'
  }
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['firebase_uid']
    },
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['deleted_at']
    },
    {
      fields: ['is_delete']
    },
    {
      fields: ['is_onboarded']
    },
    {
      fields: ['primary_role']
    }
  ],
  paranoid: false
});

// Instance methods
User.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  // Remove sensitive information
  delete values.firebase_uid;
  return values;
};

module.exports = User;

