const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserNotification = sequelize.define('UserNotification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  recipient_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'recipient_user_id'
  },
  notification_type: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'message',
    field: 'notification_type'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  body: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  data_json: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'data_json'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  },
  sender_artist_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'sender_artist_id'
  },
  sender_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'sender_user_id'
  },
  chat_doc_id: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'chat_doc_id'
  },
  live_stream_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
    field: 'live_stream_id'
  },
  message_count: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    field: 'message_count'
  }
}, {
  tableName: 'user_notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
  indexes: [
    { fields: ['recipient_user_id', 'created_at'] },
    { fields: ['recipient_user_id', 'read_at'] },
    { fields: ['chat_doc_id'] }
  ]
});

module.exports = UserNotification;
