const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Brand = sequelize.define('Brand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 255],
      isSlug(value) {
        if (!/^[a-z0-9-]+$/.test(value)) {
          throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
        }
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isValidImageUrl(value) {
        if (value == null || value === '') return;
        const isAbsolute = /^https?:\/\//i.test(value);
        const isRelativeUpload = /^\/(uploads|images)\//.test(value);
        if (!isAbsolute && !isRelativeUpload) {
          throw new Error('Image must be a valid URL or start with /uploads');
        }
      }
    }
  },
  brand_slider_image: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isValidSliderUrl(value) {
        if (value == null || value === '') return;
        const isAbsolute = /^https?:\/\//i.test(value);
        const isRelativeUpload = /^\/(uploads|images)\//.test(value);
        if (!isAbsolute && !isRelativeUpload) {
          throw new Error('Brand slider image must be a valid URL or start with /uploads');
        }
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_delete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'brands',
  timestamps: true,
  paranoid: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['slug']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_delete']
    }
  ],
  hooks: {
    beforeValidate: (brand) => {
      // Generate slug from name if not provided
      if (brand.name && !brand.slug) {
        brand.slug = brand.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
      }
    }
  }
});

module.exports = Brand;

