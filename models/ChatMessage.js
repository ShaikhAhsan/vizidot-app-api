const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chat_doc_id: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'chat_doc_id'
  },
  artist_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'artist_id'
  },
  user_id: {
    type: DataTypes.STRING(128),
    allowNull: false,
    field: 'user_id'
  },
  firebase_message_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
    field: 'firebase_message_id'
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender_type: {
    type: DataTypes.STRING(16),
    allowNull: false,
    field: 'sender_type'
  },
  sender_id: {
    type: DataTypes.STRING(128),
    allowNull: false,
    field: 'sender_id'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at'
  }
}, {
  tableName: 'chat_messages',
  timestamps: false,
  underscored: true
});

module.exports = ChatMessage;
