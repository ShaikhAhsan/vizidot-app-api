const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlayHistory = sequelize.define('PlayHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  entity_type: {
    type: DataTypes.ENUM('audio', 'video'),
    allowNull: false,
    field: 'entity_type'
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id'
  },
  played_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'played_at'
  }
}, {
  tableName: 'play_history',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['entity_type', 'entity_id'] },
    { fields: ['user_id'] },
    { fields: ['played_at'] }
  ]
});

module.exports = PlayHistory;
