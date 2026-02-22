const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserFavourite = sequelize.define('UserFavourite', {
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
  entity_type: {
    type: DataTypes.ENUM('album', 'track', 'video'),
    allowNull: false,
    field: 'entity_type'
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id'
  }
}, {
  tableName: 'user_favourites',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'entity_type', 'entity_id'],
      name: 'unique_user_favourite'
    },
    { fields: ['user_id'] },
    { fields: ['entity_type', 'entity_id'] }
  ]
});

module.exports = UserFavourite;
