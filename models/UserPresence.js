const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPresence = sequelize.define('UserPresence', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'user_id'
  },
  screen: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  context_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
    field: 'context_id'
  }
}, {
  tableName: 'user_presence',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: false,
  underscored: true
});

module.exports = UserPresence;
