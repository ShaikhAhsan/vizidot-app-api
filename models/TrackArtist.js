const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrackArtist = sequelize.define('TrackArtist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  track_type: {
    type: DataTypes.ENUM('audio', 'video'),
    allowNull: false,
    field: 'track_type'
  },
  track_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'track_id',
    comment: 'References audio_id or video_id based on track_type'
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
  tableName: 'track_artists',
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

module.exports = TrackArtist;

