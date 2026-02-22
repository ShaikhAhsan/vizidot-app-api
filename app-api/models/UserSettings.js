const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSettings = sequelize.define('UserSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE'
  },
  enable_notifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  message_notifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'en'
  }
}, {
  tableName: 'user_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [{ unique: true, fields: ['user_id'] }]
});

module.exports = UserSettings;
