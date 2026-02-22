const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BusinessTiming = sequelize.define('BusinessTiming', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  day_of_week: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 6
    },
    comment: '0 = Sunday, 1 = Monday, ..., 6 = Saturday'
  },
  opening_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  closing_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  is_24_hours: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_closed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  next_day_delivery_available: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  break_start_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  break_end_time: {
    type: DataTypes.TIME,
    allowNull: true
  }
}, {
  tableName: 'business_timings',
  indexes: [
    {
      unique: true,
      fields: ['business_id', 'day_of_week']
    },
    {
      fields: ['business_id']
    }
  ]
});

// Instance methods
BusinessTiming.prototype.getDayName = function() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[this.day_of_week];
};

BusinessTiming.prototype.isCurrentlyOpen = function() {
  if (this.is_closed) return false;
  if (this.is_24_hours) return true;
  
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  
  // Check if currently in break time
  if (this.break_start_time && this.break_end_time) {
    if (currentTime >= this.break_start_time && currentTime <= this.break_end_time) {
      return false;
    }
  }
  
  return currentTime >= this.opening_time && currentTime <= this.closing_time;
};

module.exports = BusinessTiming;

