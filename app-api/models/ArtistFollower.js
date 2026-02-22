const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ArtistFollower = sequelize.define('ArtistFollower', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'artist_id'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'created_at'
  }
}, {
  tableName: 'artist_followers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'artist_id'] },
    { fields: ['artist_id'] }
  ]
});

module.exports = ArtistFollower;
