const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShopArtist = sequelize.define('ShopArtist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'shop_id'
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'artist_id'
  }
}, {
  tableName: 'shop_artists',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = ShopArtist;

