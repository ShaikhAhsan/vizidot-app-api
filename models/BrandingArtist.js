const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BrandingArtist = sequelize.define('BrandingArtist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  branding_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'branding_id'
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'artist_id'
  }
}, {
  tableName: 'branding_artists',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = BrandingArtist;

