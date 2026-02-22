const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MusicCategory = sequelize.define('MusicCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'name'
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'slug'
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'music_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    { unique: true, fields: ['slug'], name: 'unique_music_category_slug' },
    { fields: ['is_active'] },
    { fields: ['sort_order'] }
  ]
});

module.exports = MusicCategory;
