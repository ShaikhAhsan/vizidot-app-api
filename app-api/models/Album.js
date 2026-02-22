const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Album = sequelize.define('Album', {
  album_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'album_id'
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'artist_id'
  },
  branding_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'branding_id'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  album_type: {
    type: DataTypes.ENUM('audio', 'video'),
    allowNull: false,
    field: 'album_type'
  },
  release_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'release_date'
  },
  cover_image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'cover_image_url'
  },
  default_track_thumbnail: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'default_track_thumbnail'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
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
  tableName: 'albums',
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

module.exports = Album;

