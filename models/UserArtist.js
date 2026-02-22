const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserArtist = sequelize.define('UserArtist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'artist_id',
    references: {
      model: 'artists',
      key: 'artist_id'
    }
  }
}, {
  tableName: 'user_artists',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'artist_id'],
      name: 'unique_user_artist'
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['artist_id']
    }
  ]
});

module.exports = UserArtist;

