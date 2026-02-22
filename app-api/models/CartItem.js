const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cart_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'carts',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Price at time of adding to cart'
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'price * quantity'
  },
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  added_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'cart_items',
  indexes: [
    {
      unique: true,
      fields: ['cart_id', 'product_id']
    },
    {
      fields: ['cart_id']
    },
    {
      fields: ['product_id']
    }
  ]
});

// Instance methods
CartItem.prototype.updateQuantity = async function(newQuantity) {
  if (newQuantity <= 0) {
    await this.destroy();
    return null;
  }
  
  this.quantity = newQuantity;
  this.total_price = this.price * this.quantity;
  await this.save();
  
  return this;
};

CartItem.prototype.incrementQuantity = async function(amount = 1) {
  return await this.updateQuantity(this.quantity + amount);
};

CartItem.prototype.decrementQuantity = async function(amount = 1) {
  return await this.updateQuantity(this.quantity - amount);
};

CartItem.prototype.isPriceChanged = async function() {
  const { Product } = require('./index');
  const product = await Product.findByPk(this.product_id);
  
  if (!product) return true; // Product no longer exists
  
  return product.price !== this.price;
};

CartItem.prototype.updatePrice = async function() {
  const { Product } = require('./index');
  const product = await Product.findByPk(this.product_id);
  
  if (product) {
    this.price = product.price;
    this.total_price = this.price * this.quantity;
    await this.save();
  }
  
  return this;
};

// Hooks
CartItem.beforeCreate(async (cartItem) => {
  // Get current product price
  const { Product } = require('./index');
  const product = await Product.findByPk(cartItem.product_id);
  
  if (product) {
    cartItem.price = product.price;
    cartItem.total_price = cartItem.price * cartItem.quantity;
  }
});

CartItem.beforeUpdate(async (cartItem) => {
  // Recalculate total price if quantity changed
  if (cartItem.changed('quantity')) {
    cartItem.total_price = cartItem.price * cartItem.quantity;
  }
});

CartItem.afterCreate(async (cartItem) => {
  // Update cart totals
  const { Cart } = require('./index');
  const cart = await Cart.findByPk(cartItem.cart_id);
  if (cart) {
    await cart.calculateTotals();
  }
});

CartItem.afterUpdate(async (cartItem) => {
  // Update cart totals
  const { Cart } = require('./index');
  const cart = await Cart.findByPk(cartItem.cart_id);
  if (cart) {
    await cart.calculateTotals();
  }
});

CartItem.afterDestroy(async (cartItem) => {
  // Update cart totals
  const { Cart } = require('./index');
  const cart = await Cart.findByPk(cartItem.cart_id);
  if (cart) {
    await cart.calculateTotals();
  }
});

module.exports = CartItem;

