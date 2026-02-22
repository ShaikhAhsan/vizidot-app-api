const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserMusicCategory = sequelize.define('UserMusicCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' }
  },
  music_category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'music_category_id',
    references: { model: 'music_categories', key: 'id' }
  }
}, {
  tableName: 'user_music_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'music_category_id'], name: 'unique_user_music_category' },
    { fields: ['user_id'] }
  ]
});

module.exports = UserMusicCategory;
