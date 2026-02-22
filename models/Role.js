const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Role name (e.g., super_admin, business_owner, customer)'
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Human-readable role name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Role description'
  },
  type: {
    type: DataTypes.ENUM('system', 'business', 'customer'),
    allowNull: false,
    comment: 'Role type: system (global), business (business-specific), customer'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Role hierarchy level (higher number = more permissions)'
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'JSON object containing role permissions'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['name']
    },
    {
      fields: ['type']
    },
    {
      fields: ['level']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = Role;
