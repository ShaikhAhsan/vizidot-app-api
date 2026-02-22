const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  is_verified_purchase: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_anonymous: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  helpful_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  not_helpful_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  business_reply: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  business_reply_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  moderation_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  moderated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin user ID who moderated this review'
  },
  moderated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  review_type: {
    type: DataTypes.ENUM('product', 'business', 'delivery'),
    allowNull: false,
    defaultValue: 'product'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  is_delete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'reviews',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['product_id']
    },
    {
      fields: ['business_id']
    },
    {
      fields: ['order_id']
    },
    {
      fields: ['rating']
    },
    {
      fields: ['is_approved']
    },
    {
      fields: ['is_verified_purchase']
    },
    {
      fields: ['review_type']
    },
    {
      fields: ['is_delete']
    }
  ]
});

// Instance methods
Review.prototype.getStarRating = function() {
  return '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
};

Review.prototype.isHelpful = function() {
  return this.helpful_count > this.not_helpful_count;
};

Review.prototype.getHelpfulnessRatio = function() {
  const total = this.helpful_count + this.not_helpful_count;
  if (total === 0) return 0;
  return Math.round((this.helpful_count / total) * 100);
};

Review.prototype.canBeEdited = function() {
  // Reviews can be edited within 24 hours of creation
  const hoursSinceCreation = (new Date() - this.created_at) / (1000 * 60 * 60);
  return hoursSinceCreation < 24 && !this.is_approved;
};

Review.prototype.canBeDeleted = function() {
  // Reviews can be deleted if not approved or within 24 hours
  const hoursSinceCreation = (new Date() - this.created_at) / (1000 * 60 * 60);
  return !this.is_approved || hoursSinceCreation < 24;
};

// Hooks
Review.afterCreate(async (review) => {
  // Update product/business rating averages
  if (review.product_id) {
    const { Product } = require('./index');
    await updateProductRating(review.product_id);
  }
  
  if (review.business_id) {
    const { Business } = require('./index');
    await updateBusinessRating(review.business_id);
  }
});

Review.afterUpdate(async (review) => {
  // Update rating averages if rating changed
  if (review.changed('rating') || review.changed('is_approved')) {
    if (review.product_id) {
      const { Product } = require('./index');
      await updateProductRating(review.product_id);
    }
    
    if (review.business_id) {
      const { Business } = require('./index');
      await updateBusinessRating(review.business_id);
    }
  }
});

Review.afterDestroy(async (review) => {
  // Update rating averages after deletion
  if (review.product_id) {
    const { Product } = require('./index');
    await updateProductRating(review.product_id);
  }
  
  if (review.business_id) {
    const { Business } = require('./index');
    await updateBusinessRating(review.business_id);
  }
});

// Helper functions
async function updateProductRating(productId) {
  const { Product } = require('./index');
  const result = await Review.findOne({
    where: {
      product_id: productId,
      is_approved: true
    },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
    ],
    raw: true
  });
  
  if (result) {
    await Product.update({
      rating: parseFloat(result.avgRating) || 0,
      total_reviews: parseInt(result.totalReviews) || 0
    }, {
      where: { id: productId }
    });
  }
}

async function updateBusinessRating(businessId) {
  const { Business } = require('./index');
  const result = await Review.findOne({
    where: {
      business_id: businessId,
      is_approved: true
    },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
    ],
    raw: true
  });
  
  if (result) {
    await Business.update({
      rating: parseFloat(result.avgRating) || 0,
      total_reviews: parseInt(result.totalReviews) || 0
    }, {
      where: { id: businessId }
    });
  }
}

module.exports = Review;

