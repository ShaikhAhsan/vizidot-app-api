const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AudioTrack = sequelize.define('AudioTrack', {
  audio_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'audio_id'
  },
  album_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'album_id'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  audio_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'audio_url'
  },
  thumbnail_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'thumbnail_url'
  },
  track_number: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'track_number'
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
  tableName: 'audio_tracks',
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

module.exports = AudioTrack;

