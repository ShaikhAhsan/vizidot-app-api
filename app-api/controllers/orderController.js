const { firebaseUtils } = require('../config/firebase');
const { sequelize } = require('../config/database');
const { Order, OrderItem, Product, Business, User } = require('../models');
const { Op } = require('sequelize');

class OrderController {
  /**
   * Create order in both MySQL and Firebase
   */
  async createOrder(req, res) {
    try {
      const orderData = {
        ...req.body,
        user_id: req.user.id
      };
      
      // Validate business exists and is active
      const business = await Business.findOne({
        where: {
          id: orderData.business_id,
          is_active: true
        }
      });
      
      if (!business) {
        return res.status(400).json({
          success: false,
          error: 'Business not found or inactive'
        });
      }
      
      // Create order in MySQL
      const mysqlOrder = await Order.create(orderData);
      
      // Create order items
      if (req.body.items && req.body.items.length > 0) {
        const orderItems = [];
        
        for (const item of req.body.items) {
          const product = await Product.findByPk(item.product_id);
          if (!product) {
            throw new Error(`Product with ID ${item.product_id} not found`);
          }
          
          if (product.stock_quantity < item.quantity) {
            throw new Error(`Insufficient stock for product ${product.name}`);
          }
          
          orderItems.push({
            order_id: mysqlOrder.id,
            product_id: item.product_id,
            product_name: product.name,
            product_sku: product.sku,
            product_price: product.price,
            quantity: item.quantity,
            product_image: product.getMainImage(),
            product_description: product.description,
            product_weight: product.weight,
            product_unit: product.unit
          });
        }
        
        await OrderItem.bulkCreate(orderItems);
        
        // Update product stock
        for (const item of req.body.items) {
          await Product.update(
            { stock_quantity: sequelize.literal(`stock_quantity - ${item.quantity}`) },
            { where: { id: item.product_id } }
          );
        }
      }
      
      // Create in Firebase for real-time tracking
      const firebaseOrder = {
        mysql_id: mysqlOrder.id,
        firebase_id: `order_${mysqlOrder.id}`,
        business_id: `business_${mysqlOrder.business_id}`,
        user_id: `user_${mysqlOrder.user_id}`,
        status: 'pending',
        items: await this.getOrderItemsForFirebase(mysqlOrder.id),
        total_amount: mysqlOrder.total_amount,
        delivery_address: mysqlOrder.delivery_address,
        delivery_type: mysqlOrder.delivery_type,
        estimated_delivery_time: firebaseUtils.timestamp(),
        created_at: firebaseUtils.timestamp(),
        updated_at: firebaseUtils.timestamp(),
        tracking_updates: [{
          status: 'pending',
          timestamp: firebaseUtils.timestamp(),
          message: 'Order placed successfully'
        }]
      };
      
      await db.collection('active_orders')
        .doc(`order_${mysqlOrder.id}`)
        .set(firebaseOrder);
      
      // Get complete order with items
      const completeOrder = await Order.findByPk(mysqlOrder.id, {
        include: [
          { model: OrderItem, as: 'items' },
          { model: Business, as: 'business' },
          { model: User, as: 'user' }
        ]
      });
      
      res.status(201).json({
        success: true,
        data: {
          mysql_order: completeOrder,
          firebase_order: firebaseOrder
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update order status with real-time Firebase updates
   */
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, message } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }
      
      // Update MySQL
      const updatedOrder = await Order.update(
        { 
          order_status: status, 
          updated_at: new Date() 
        },
        { where: { id: orderId } }
      );
      
      if (updatedOrder[0] === 0) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      
      // Update Firebase with new tracking update
      const orderRef = db.collection('active_orders').doc(`order_${orderId}`);
      const trackingUpdate = {
        status,
        timestamp: firebaseUtils.timestamp(),
        message: message || `Order status updated to ${status}`
      };
      
      await orderRef.update({
        status,
        updated_at: firebaseUtils.timestamp(),
        tracking_updates: firebaseUtils.arrayUnion(trackingUpdate)
      });
      
      // If delivered, move to MySQL history and remove from Firebase
      if (status === 'delivered') {
        await this.moveOrderToHistory(orderId);
      }
      
      // If cancelled, restore product stock
      if (status === 'cancelled') {
        await this.restoreProductStock(orderId);
      }
      
      res.json({
        success: true,
        data: { orderId, status, message }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Move completed order from Firebase to MySQL history
   */
  async moveOrderToHistory(orderId) {
    try {
      const orderRef = db.collection('active_orders').doc(`order_${orderId}`);
      const orderDoc = await orderRef.get();
      
      if (orderDoc.exists) {
        const firebaseOrder = orderDoc.data();
        
        // Update MySQL with completion details
        await Order.update({
          order_status: 'delivered',
          actual_delivery_time: new Date(),
          updated_at: new Date()
        }, { where: { id: orderId } });
        
        // Remove from Firebase active orders
        await orderRef.delete();
        
        // Archive to Firebase history collection
        await db.collection('order_history')
          .doc(`order_${orderId}`)
          .set({
            ...firebaseOrder,
            archived_at: firebaseUtils.timestamp()
          });
      }
    } catch (error) {
      console.error('Error moving order to history:', error);
    }
  }

  /**
   * Restore product stock when order is cancelled
   */
  async restoreProductStock(orderId) {
    try {
      const orderItems = await OrderItem.findAll({
        where: { order_id: orderId }
      });
      
      for (const item of orderItems) {
        await Product.update(
          { stock_quantity: sequelize.literal(`stock_quantity + ${item.quantity}`) },
          { where: { id: item.product_id } }
        );
      }
    } catch (error) {
      console.error('Error restoring product stock:', error);
    }
  }

  /**
   * Get real-time order updates
   */
  async getOrderUpdates(req, res) {
    try {
      const { orderId } = req.params;
      const orderRef = db.collection('active_orders').doc(`order_${orderId}`);
      
      // Setup response for Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Set up real-time listener
      const unsubscribe = orderRef.onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          res.write(`data: ${JSON.stringify({
            success: true,
            data: {
              id: doc.id,
              ...data
            }
          })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({
            success: false,
            error: 'Order not found'
          })}\n\n`);
        }
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
   * Get order items for Firebase
   */
  async getOrderItemsForFirebase(orderId) {
    const orderItems = await OrderItem.findAll({
      where: { order_id: orderId },
      include: [Product]
    });
    
    return orderItems.map(item => ({
      product_id: `product_${item.product_id}`,
      name: item.product_name,
      price: item.product_price,
      quantity: item.quantity,
      image: item.product_image,
      unit: item.product_unit
    }));
  }

  /**
   * Get user orders
   */
  async getUserOrders(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = { user_id: req.user.id };
      if (status) {
        whereClause.order_status = status;
      }
      
      const orders = await Order.findAndCountAll({
        where: whereClause,
        include: [
          { model: OrderItem, as: 'items' },
          { model: Business, as: 'business' }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['created_at', 'DESC']]
      });
      
      res.json({
        success: true,
        data: orders.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: orders.count,
          totalPages: Math.ceil(orders.count / limit)
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get business orders
   */
  async getBusinessOrders(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = { business_id: req.business.id };
      if (status) {
        whereClause.order_status = status;
      }
      
      const orders = await Order.findAndCountAll({
        where: whereClause,
        include: [
          { model: OrderItem, as: 'items' },
          { model: User, as: 'user' }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['created_at', 'DESC']]
      });
      
      res.json({
        success: true,
        data: orders.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: orders.count,
          totalPages: Math.ceil(orders.count / limit)
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(req, res) {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findByPk(orderId, {
        include: [
          { model: OrderItem, as: 'items' },
          { model: Business, as: 'business' },
          { model: User, as: 'user' }
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
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = OrderController;

