const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserDevice = sequelize.define('UserDevice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  },
  device_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'devices', key: 'id' },
    onDelete: 'CASCADE'
  },
  fcm_token: {
    type: DataTypes.STRING(512),
    allowNull: true,
    comment: 'FCM token for push notifications'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  last_seen_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_devices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'device_id'] },
    { fields: ['user_id', 'is_active'] },
    { fields: ['device_id', 'is_active'] }
  ]
});

module.exports = UserDevice;
