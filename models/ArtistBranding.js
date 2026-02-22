const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ArtistBranding = sequelize.define('ArtistBranding', {
  branding_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'branding_id'
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable because we use many-to-many relationship through branding_artists
    field: 'artist_id'
  },
  branding_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'branding_name'
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'logo_url'
  },
  tagline: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  background_color: {
    type: DataTypes.STRING(7), // Hex color format: #RRGGBB
    allowNull: true,
    field: 'background_color',
    validate: {
      is: /^#[0-9A-Fa-f]{6}$/ // Validate hex color format
    }
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
  tableName: 'artist_brandings',
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

module.exports = ArtistBranding;

