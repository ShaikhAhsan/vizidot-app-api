const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  device_id: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: 'UUID from app, stored in Keychain/EncryptedSharedPrefs'
  },
  platform: {
    type: DataTypes.ENUM('ios', 'android', 'web'),
    allowNull: false
  },
  device_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'devices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    { unique: true, fields: ['device_id'] },
    { fields: ['platform'] }
  ]
});

module.exports = Device;
