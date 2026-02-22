const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unit name (e.g., kg, piece, liter)'
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Display name for the unit'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Unit category (weight, volume, count, etc.)'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  usage_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times this unit has been used'
  }
}, {
  tableName: 'units',
  indexes: [
    {
      unique: true,
      fields: ['name']
    },
    {
      fields: ['category']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['usage_count']
    }
  ]
});

// Instance methods
Unit.prototype.incrementUsage = async function() {
  this.usage_count += 1;
  await this.save();
  return this.usage_count;
};

module.exports = Unit;
