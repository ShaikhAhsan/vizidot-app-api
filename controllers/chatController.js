const { db, firebaseUtils } = require('../config/firebase');
const { Order, User, Business } = require('../models');

class ChatController {
  /**
   * Send message to Firebase Firestore
   */
  async sendMessage(req, res) {
    try {
      const { orderId, message, messageType = 'text' } = req.body;
      
      // Validate order exists and user has access
      const order = await Order.findByPk(orderId, {
        include: [
          { model: User, as: 'user' },
          { model: Business, as: 'business' }
        ]
      });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      
      // Check if user has access to this order
      if (req.user.user_type !== 'admin' && 
          order.user_id !== req.user.id && 
          order.business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      // Determine sender type
      let senderType = 'user';
      if (req.user.id === order.business.user_id) {
        senderType = 'business';
      } else if (req.user.user_type === 'admin') {
        senderType = 'admin';
      }
      
      const chatRef = db.collection('chats')
        .doc(orderId)
        .collection('messages')
        .doc();
      
      const messageData = {
        id: chatRef.id,
        order_id: orderId,
        sender_id: req.user.id.toString(),
        sender_type: senderType,
        sender_name: req.user.getFullName(),
        message: message,
        message_type: messageType,
        is_read: false,
        read_by: [],
        created_at: firebaseUtils.timestamp()
      };
      
      await chatRef.set(messageData);
      
      // Update last message in chat summary
      await db.collection('chats')
        .doc(orderId)
        .set({
          order_id: orderId,
          last_message: message,
          last_message_time: firebaseUtils.timestamp(),
          last_sender_type: senderType,
          last_sender_name: req.user.getFullName(),
          updated_at: firebaseUtils.timestamp(),
          participants: [req.user.id.toString(), order.business.user_id.toString()]
        }, { merge: true });
      
      res.json({
        success: true,
        data: messageData
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get real-time chat messages
   */
  async getChatMessages(req, res) {
    try {
      const { orderId } = req.params;
      
      // Validate order exists and user has access
      const order = await Order.findByPk(orderId, {
        include: [
          { model: User, as: 'user' },
          { model: Business, as: 'business' }
        ]
      });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      
      // Check if user has access to this order
      if (req.user.user_type !== 'admin' && 
          order.user_id !== req.user.id && 
          order.business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const messagesRef = db.collection('chats')
        .doc(orderId)
        .collection('messages')
        .orderBy('created_at', 'asc');
      
      // Setup response for Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Real-time listener
      const unsubscribe = messagesRef.onSnapshot((snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
          messages.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        res.write(`data: ${JSON.stringify({
          success: true,
          data: messages
        })}\n\n`);
      }, (error) => {
        console.error('Firebase listener error:', error);
        res.write(`data: ${JSON.stringify({
          success: false,
          error: 'Connection error'
        })}\n\n`);
      });
      
      // Clean up on client disconnect
      req.on('close', () => {
        unsubscribe();
      });
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get chat history (non-real-time)
   */
  async getChatHistory(req, res) {
    try {
      const { orderId } = req.params;
      const { limit = 50 } = req.query;
      
      // Validate order exists and user has access
      const order = await Order.findByPk(orderId, {
        include: [
          { model: User, as: 'user' },
          { model: Business, as: 'business' }
        ]
      });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      
      // Check if user has access to this order
      if (req.user.user_type !== 'admin' && 
          order.user_id !== req.user.id && 
          order.business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const messagesRef = db.collection('chats')
        .doc(orderId)
        .collection('messages')
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit));
      
      const snapshot = await messagesRef.get();
      const messages = [];
      
      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Reverse to get chronological order
      messages.reverse();
      
      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(req, res) {
    try {
      const { orderId } = req.params;
      const { messageIds } = req.body;
      
      // Validate order exists and user has access
      const order = await Order.findByPk(orderId, {
        include: [
          { model: User, as: 'user' },
          { model: Business, as: 'business' }
        ]
      });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      
      // Check if user has access to this order
      if (req.user.user_type !== 'admin' && 
          order.user_id !== req.user.id && 
          order.business.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      const batch = db.batch();
      
      for (const messageId of messageIds) {
        const messageRef = db.collection('chats')
          .doc(orderId)
          .collection('messages')
          .doc(messageId);
        
        batch.update(messageRef, {
          read_by: firebaseUtils.arrayUnion(req.user.id.toString()),
          is_read: true
        });
      }
      
      await batch.commit();
      
      res.json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's chat list
   */
  async getChatList(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      let whereClause = {};
      
      if (req.user.user_type === 'customer') {
        // Get orders where user is the customer
        whereClause = { user_id: req.user.id };
      } else if (req.user.user_type === 'business') {
        // Get orders where user owns the business
        const businesses = await Business.findAll({
          where: { user_id: req.user.id },
          attributes: ['id']
        });
        const businessIds = businesses.map(b => b.id);
        whereClause = { business_id: { [require('sequelize').Op.in]: businessIds } };
      }
      
      const orders = await Order.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'user' },
          { model: Business, as: 'business' }
        ],
        order: [['updated_at', 'DESC']],
        limit: parseInt(limit),
        offset: (page - 1) * limit
      });
      
      // Get chat summaries from Firebase
      const chatSummaries = [];
      
      for (const order of orders) {
        try {
          const chatDoc = await db.collection('chats')
            .doc(order.id.toString())
            .get();
          
          if (chatDoc.exists) {
            const chatData = chatDoc.data();
            chatSummaries.push({
              order_id: order.id,
              order_number: order.order_number,
              order_status: order.order_status,
              business_name: order.business.business_name,
              customer_name: order.user.getFullName(),
              last_message: chatData.last_message,
              last_message_time: chatData.last_message_time,
              last_sender_type: chatData.last_sender_type,
              unread_count: 0 // This would need to be calculated based on read_by arrays
            });
          }
        } catch (error) {
          console.error(`Error getting chat for order ${order.id}:`, error);
        }
      }
      
      res.json({
        success: true,
        data: chatSummaries
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ChatController;

