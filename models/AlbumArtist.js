const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AlbumArtist = sequelize.define('AlbumArtist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  album_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'album_id'
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'artist_id'
  },
  role: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'e.g., Featured, Producer, Writer'
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_deleted'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  }
}, {
  tableName: 'album_artists',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  defaultScope: {
    where: { is_deleted: false }
  },
  scopes: {
    withDeleted: {
      where: {}
    },
    deleted: {
      where: { is_deleted: true }
    }
  }
});

module.exports = AlbumArtist;

