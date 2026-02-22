const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Artist = sequelize.define('Artist', {
  artist_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'artist_id'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'dob'
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'shop_id'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_featured'
  },
  is_rising_star: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_rising_star'
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
  tableName: 'artists',
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

module.exports = Artist;

