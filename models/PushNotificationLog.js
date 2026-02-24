const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PushNotificationLog = sequelize.define('PushNotificationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  custom_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Custom key-value params sent in data payload'
  },
  token_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  success_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  failure_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'partial', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  error_summary: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'push_notification_log',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    { fields: ['created_at'] },
    { fields: ['status'] }
  ]
});

module.exports = PushNotificationLog;
