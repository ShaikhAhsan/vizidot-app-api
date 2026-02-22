const { db, firebaseUtils } = require('../config/firebase');
const models = require('../models');

class DummyDataSeeder {
  constructor() {
    this.businesses = [];
    this.categories = [];
    this.products = [];
    this.users = [];
    this.coupons = [];
  }

  async seedAll() {
    console.log('🌱 Starting dummy data seeding...');
    
    try {
      // Clear existing data
      await this.clearExistingData();
      
      // Seed in order to maintain relationships
      await this.seedUsers();
      await this.seedBusinesses();
      await this.seedCategories();
      await this.seedProducts();
      await this.seedCoupons();
      await this.seedOrders();
      await this.seedReviews();
      await this.seedFirebaseData();
      
      console.log('✅ Dummy data seeding completed successfully!');
    } catch (error) {
      console.error('❌ Error seeding dummy data:', error);
    }
  }

  async seedUsers() {
    console.log('👥 Seeding users...');
    
    const users = [
      {
        firebase_uid: 'user_dummy_1',
        email: 'customer1@ebazar.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+923001234567',
        user_type: 'customer',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        firebase_uid: 'user_dummy_2',
        email: 'customer2@ebazar.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+923007654321',
        user_type: 'customer',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        firebase_uid: 'business_dummy_1',
        email: 'business1@ebazar.com',
        first_name: 'Sheen',
        last_name: 'Grocery',
        phone: '+923001111111',
        user_type: 'business',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        firebase_uid: 'business_dummy_2',
        email: 'business2@ebazar.com',
        first_name: 'Milk',
        last_name: 'More',
        phone: '+923002222222',
        user_type: 'business',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        firebase_uid: 'admin_dummy_1',
        email: 'admin@ebazar.com',
        first_name: 'Admin',
        last_name: 'User',
        phone: '+923003333333',
        user_type: 'admin',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    this.users = await models.User.bulkCreate(users);
    console.log(`✅ Created ${this.users.length} users`);
  }

  async seedBusinesses() {
    console.log('🏢 Seeding businesses...');
    
    const businesses = [
      {
        user_id: this.users[2].id,
        business_name: 'Sheen Grocery Store',
        business_slug: 'sheen-grocery-store',
        logo: '/images/businesses/sheen-logo.png',
        primary_color: '#FF6B35',
        secondary_color: '#2EC4B6',
        description: 'Your one-stop shop for fresh groceries and daily essentials',
        contact_phone: '+923001234568',
        contact_email: 'info@sheengrocery.com',
        address: 'Main Market, Gulberg, Lahore',
        latitude: 31.5204,
        longitude: 74.3587,
        is_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: this.users[3].id,
        business_name: 'Milk & More',
        business_slug: 'milk-and-more',
        logo: '/images/businesses/milk-logo.png',
        primary_color: '#4ECDC4',
        secondary_color: '#FFE66D',
        description: 'Fresh dairy products and beverages',
        contact_phone: '+923001234569',
        contact_email: 'contact@milkandmore.com',
        address: 'Defence Road, Lahore',
        latitude: 31.4676,
        longitude: 74.2569,
        is_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    this.businesses = await models.Business.bulkCreate(businesses);
    
    // Seed business timings
    const timings = [];
    this.businesses.forEach(business => {
      for (let day = 0; day < 7; day++) {
        timings.push({
          business_id: business.id,
          day_of_week: day,
          opening_time: '08:00',
          closing_time: '22:00',
          is_24_hours: false,
          is_closed: day === 0, // Closed on Sunday
          next_day_delivery_available: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    });
    
    await models.BusinessTiming.bulkCreate(timings);
    console.log(`✅ Created ${this.businesses.length} businesses with timings`);
  }

  async seedCategories() {
    console.log('📁 Seeding categories...');
    
    const categories = [
      // Sheen Grocery Categories
      {
        business_id: this.businesses[0].id,
        name: 'Fruits & Vegetables',
        slug: 'fruits-vegetables',
        description: 'Fresh fruits and vegetables',
        image: '/images/categories/fruits-veggies.jpg',
        sort_order: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        business_id: this.businesses[0].id,
        name: 'Dairy & Eggs',
        slug: 'dairy-eggs',
        description: 'Milk, cheese, eggs and more',
        image: '/images/categories/dairy.jpg',
        sort_order: 2,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        business_id: this.businesses[0].id,
        name: 'Bakery',
        slug: 'bakery',
        description: 'Fresh bread and baked goods',
        image: '/images/categories/bakery.jpg',
        sort_order: 3,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Milk & More Categories
      {
        business_id: this.businesses[1].id,
        name: 'Fresh Milk',
        slug: 'fresh-milk',
        description: 'Various types of fresh milk',
        image: '/images/categories/milk.jpg',
        sort_order: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        business_id: this.businesses[1].id,
        name: 'Yogurt & Cheese',
        slug: 'yogurt-cheese',
        description: 'Fresh yogurt and cheese products',
        image: '/images/categories/yogurt.jpg',
        sort_order: 2,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    this.categories = await models.Category.bulkCreate(categories);
    console.log(`✅ Created ${this.categories.length} categories`);
  }

  async seedProducts() {
    console.log('📦 Seeding products...');
    
    const products = [
      // Sheen Grocery Products
      {
        business_id: this.businesses[0].id,
        category_id: this.categories[0].id,
        name: 'Fresh Apples',
        slug: 'fresh-apples',
        description: 'Crispy red apples, perfect for snacks',
        price: 120,
        old_price: 150,
        cost_price: 80,
        stock_quantity: 100,
        min_stock_alert: 10,
        images: JSON.stringify(['/images/products/apples.jpg']),
        brand_name: 'Fresh Farms',
        unit: 'kg',
        weight: 1,
        tags: JSON.stringify(['fruits', 'fresh', 'healthy']),
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        business_id: this.businesses[0].id,
        category_id: this.categories[0].id,
        name: 'Bananas',
        slug: 'bananas',
        description: 'Sweet and ripe bananas',
        price: 80,
        old_price: 100,
        cost_price: 50,
        stock_quantity: 50,
        min_stock_alert: 5,
        images: JSON.stringify(['/images/products/bananas.jpg']),
        brand_name: 'Tropical',
        unit: 'dozen',
        weight: 1.5,
        tags: JSON.stringify(['fruits', 'energy', 'potassium']),
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        business_id: this.businesses[0].id,
        category_id: this.categories[1].id,
        name: 'Fresh Milk 1L',
        slug: 'fresh-milk-1l',
        description: 'Pure and fresh milk',
        price: 180,
        old_price: 200,
        cost_price: 120,
        stock_quantity: 200,
        min_stock_alert: 20,
        images: JSON.stringify(['/images/products/milk.jpg']),
        brand_name: 'MilkPure',
        unit: 'liter',
        weight: 1,
        tags: JSON.stringify(['dairy', 'fresh', 'calcium']),
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        business_id: this.businesses[0].id,
        category_id: this.categories[2].id,
        name: 'White Bread',
        slug: 'white-bread',
        description: 'Fresh white bread',
        price: 60,
        cost_price: 40,
        stock_quantity: 30,
        min_stock_alert: 5,
        images: JSON.stringify(['/images/products/bread.jpg']),
        brand_name: 'Bakery Fresh',
        unit: 'loaf',
        weight: 0.5,
        tags: JSON.stringify(['bakery', 'bread', 'fresh']),
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Milk & More Products
      {
        business_id: this.businesses[1].id,
        category_id: this.categories[3].id,
        name: 'Premium Milk 1L',
        slug: 'premium-milk-1l',
        description: 'Premium quality fresh milk',
        price: 200,
        old_price: 220,
        cost_price: 140,
        stock_quantity: 150,
        min_stock_alert: 15,
        images: JSON.stringify(['/images/products/premium-milk.jpg']),
        brand_name: 'Premium Dairy',
        unit: 'liter',
        weight: 1,
        tags: JSON.stringify(['dairy', 'premium', 'fresh']),
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        business_id: this.businesses[1].id,
        category_id: this.categories[4].id,
        name: 'Greek Yogurt',
        slug: 'greek-yogurt',
        description: 'Creamy Greek yogurt',
        price: 150,
        cost_price: 100,
        stock_quantity: 80,
        min_stock_alert: 10,
        images: JSON.stringify(['/images/products/yogurt.jpg']),
        brand_name: 'Greek Style',
        unit: 'cup',
        weight: 0.5,
        tags: JSON.stringify(['yogurt', 'healthy', 'protein']),
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    this.products = await models.Product.bulkCreate(products);
    
    // Generate SKUs after creation
    for (let product of this.products) {
      const sku = `BUS${product.business_id}-PROD${product.id}`;
      await product.update({ sku });
    }
    
    console.log(`✅ Created ${this.products.length} products`);
  }

  async seedCoupons() {
    console.log('🎫 Seeding coupons...');
    
    const coupons = [
      {
        code: 'WELCOME10',
        name: 'Welcome Discount',
        description: '10% off on first order',
        coupon_type: 'percentage',
        discount_value: 10,
        max_discount_amount: 500,
        min_order_amount: 1000,
        usage_limit: 100,
        usage_count: 0,
        used_by_user_limit: 1,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        is_active: true,
        created_by: 'admin',
        creator_id: this.users[4].id,
        scope_type: 'global',
        stackable: false,
        priority: 1,
        auto_apply: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'FREEDELIVERY',
        name: 'Free Delivery',
        description: 'Free delivery on all orders',
        coupon_type: 'free_delivery',
        discount_value: 100,
        min_order_amount: 500,
        usage_limit: 50,
        usage_count: 0,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        is_active: true,
        created_by: 'business',
        creator_id: this.businesses[0].id,
        scope_type: 'business',
        scope_ids: JSON.stringify([this.businesses[0].id]),
        stackable: true,
        priority: 2,
        auto_apply: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'SAVE20',
        name: 'Save 20%',
        description: '20% off on orders above 2000',
        coupon_type: 'percentage',
        discount_value: 20,
        max_discount_amount: 1000,
        min_order_amount: 2000,
        usage_limit: 25,
        usage_count: 0,
        used_by_user_limit: 2,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        is_active: true,
        created_by: 'admin',
        creator_id: this.users[4].id,
        scope_type: 'global',
        stackable: false,
        priority: 3,
        auto_apply: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    // Ensure FK to businesses is respected: when created_by is 'admin', do not set creator_id
    const adjustedCoupons = coupons.map(coupon => (
      coupon.created_by === 'admin' ? { ...coupon, creator_id: null } : coupon
    ));
    this.coupons = await models.Coupon.bulkCreate(adjustedCoupons);
    console.log(`✅ Created ${this.coupons.length} coupons`);
  }

  async seedOrders() {
    console.log('📋 Seeding orders...');
    
    const orders = [
      {
        user_id: this.users[0].id,
        business_id: this.businesses[0].id,
        order_status: 'pending',
        subtotal_amount: 200,
        delivery_fee: 50,
        discount_amount: 0,
        tax_amount: 30,
        total_amount: 280,
        delivery_type: 'convenience',
        delivery_eta: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        customer_notes: 'Please deliver before 6 PM',
        payment_status: 'paid',
        payment_method: 'credit_card',
        delivery_address: {
          street: '123 Main Street',
          city: 'Lahore',
          country: 'Pakistan',
          postal_code: '54000'
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: this.users[1].id,
        business_id: this.businesses[1].id,
        order_status: 'confirmed',
        subtotal_amount: 360,
        delivery_fee: 0,
        discount_amount: 36,
        tax_amount: 32.4,
        total_amount: 356.4,
        delivery_type: 'quick',
        delivery_eta: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
        payment_status: 'paid',
        payment_method: 'cash_on_delivery',
        delivery_address: {
          street: '456 Defence Road',
          city: 'Lahore',
          country: 'Pakistan',
          postal_code: '54000'
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: this.users[0].id,
        business_id: this.businesses[0].id,
        order_status: 'delivered',
        subtotal_amount: 180,
        delivery_fee: 50,
        discount_amount: 18,
        tax_amount: 21.6,
        total_amount: 233.6,
        delivery_type: 'convenience',
        delivery_eta: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        actual_delivery_time: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        payment_status: 'paid',
        payment_method: 'credit_card',
        delivery_address: {
          street: '123 Main Street',
          city: 'Lahore',
          country: 'Pakistan',
          postal_code: '54000'
        },
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      }
    ];
    
    // Use individual hooks to auto-generate order_number via model hook
    this.orders = await models.Order.bulkCreate(orders, { individualHooks: true });
    
    // Seed order items
    const orderItems = [
      {
        order_id: this.orders[0].id,
        product_id: this.products[0].id,
        product_name: 'Fresh Apples',
        product_sku: this.products[0].sku,
        product_price: 120,
        quantity: 1,
        total_price: 120,
        applied_discount: 0,
        final_price: 120,
        product_image: '/images/products/apples.jpg',
        product_description: 'Crispy red apples, perfect for snacks',
        product_weight: 1,
        product_unit: 'kg',
        created_at: new Date()
      },
      {
        order_id: this.orders[0].id,
        product_id: this.products[1].id,
        product_name: 'Bananas',
        product_sku: this.products[1].sku,
        product_price: 80,
        quantity: 1,
        total_price: 80,
        applied_discount: 0,
        final_price: 80,
        product_image: '/images/products/bananas.jpg',
        product_description: 'Sweet and ripe bananas',
        product_weight: 1.5,
        product_unit: 'dozen',
        created_at: new Date()
      },
      {
        order_id: this.orders[1].id,
        product_id: this.products[4].id,
        product_name: 'Premium Milk 1L',
        product_sku: this.products[4].sku,
        product_price: 200,
        quantity: 2,
        total_price: 400,
        applied_discount: 40,
        final_price: 360,
        product_image: '/images/products/premium-milk.jpg',
        product_description: 'Premium quality fresh milk',
        product_weight: 1,
        product_unit: 'liter',
        created_at: new Date()
      },
      {
        order_id: this.orders[2].id,
        product_id: this.products[2].id,
        product_name: 'Fresh Milk 1L',
        product_sku: this.products[2].sku,
        product_price: 180,
        quantity: 1,
        total_price: 180,
        applied_discount: 18,
        final_price: 162,
        product_image: '/images/products/milk.jpg',
        product_description: 'Pure and fresh milk',
        product_weight: 1,
        product_unit: 'liter',
        created_at: new Date()
      }
    ];
    
    await models.OrderItem.bulkCreate(orderItems);
    console.log(`✅ Created ${this.orders.length} orders with items`);
  }

  async seedReviews() {
    console.log('⭐ Seeding reviews...');
    
    const reviews = [
      {
        user_id: this.users[0].id,
        product_id: this.products[0].id,
        order_id: this.orders[0].id,
        rating: 5,
        title: 'Excellent Quality',
        comment: 'The apples were fresh and delicious!',
        is_verified_purchase: true,
        is_approved: true,
        review_type: 'product',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: this.users[1].id,
        product_id: this.products[4].id,
        order_id: this.orders[1].id,
        rating: 4,
        title: 'Good Milk',
        comment: 'Fresh milk, delivered on time',
        is_verified_purchase: true,
        is_approved: true,
        review_type: 'product',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: this.users[0].id,
        business_id: this.businesses[0].id,
        order_id: this.orders[2].id,
        rating: 5,
        title: 'Great Service',
        comment: 'Fast delivery and good quality products',
        is_verified_purchase: true,
        is_approved: true,
        review_type: 'business',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    await models.Review.bulkCreate(reviews);
    console.log(`✅ Created ${reviews.length} reviews`);
  }

  async seedFirebaseData() {
    console.log('🔥 Seeding Firebase data...');
    
    // Seed active orders in Firebase
    for (let order of this.orders) {
      if (order.order_status !== 'delivered') {
        const firebaseOrder = {
          mysql_id: order.id,
          firebase_id: `order_${order.id}`,
          business_id: `business_${order.business_id}`,
          user_id: `user_${order.user_id}`,
          status: order.order_status,
          items: await this.getOrderItemsForFirebase(order.id),
          total_amount: order.total_amount,
          delivery_address: order.delivery_address,
          delivery_type: order.delivery_type,
          estimated_delivery_time: firebaseUtils.timestamp(),
          created_at: firebaseUtils.timestamp(),
          updated_at: firebaseUtils.timestamp(),
          tracking_updates: [{
            status: order.order_status,
            timestamp: firebaseUtils.timestamp(),
            message: 'Order placed successfully'
          }]
        };
        
        await db.collection('active_orders')
          .doc(`order_${order.id}`)
          .set(firebaseOrder);
      }
    }
    
    // Seed some chat messages
    for (let order of this.orders.slice(0, 2)) { // Only for first 2 orders
      const messages = [
        {
          order_id: order.id.toString(),
          sender_id: order.user_id.toString(),
          sender_type: 'user',
          sender_name: this.users.find(u => u.id === order.user_id).getFullName(),
          message: 'Hello, when will my order be delivered?',
          message_type: 'text',
          is_read: false,
          read_by: [],
          created_at: firebaseUtils.timestamp()
        },
        {
          order_id: order.id.toString(),
          sender_id: this.businesses.find(b => b.id === order.business_id).user_id.toString(),
          sender_type: 'business',
          sender_name: this.businesses.find(b => b.id === order.business_id).business_name,
          message: 'Your order will be delivered within the estimated time.',
          message_type: 'text',
          is_read: true,
          read_by: [order.user_id.toString()],
          created_at: firebaseUtils.timestamp()
        }
      ];
      
      for (let message of messages) {
        const messageRef = db.collection('chats')
          .doc(order.id.toString())
          .collection('messages')
          .doc();
        
        await messageRef.set({
          id: messageRef.id,
          ...message
        });
      }
      
      // Update chat summary
      await db.collection('chats')
        .doc(order.id.toString())
        .set({
          order_id: order.id.toString(),
          last_message: messages[messages.length - 1].message,
          last_message_time: firebaseUtils.timestamp(),
          last_sender_type: messages[messages.length - 1].sender_type,
          last_sender_name: messages[messages.length - 1].sender_name,
          updated_at: firebaseUtils.timestamp(),
          participants: [order.user_id.toString(), this.businesses.find(b => b.id === order.business_id).user_id.toString()]
        });
    }
    
    console.log('✅ Firebase data seeded successfully');
  }

  async getOrderItemsForFirebase(orderId) {
    const orderItems = await models.OrderItem.findAll({
      where: { order_id: orderId },
      include: [models.Product]
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

  async clearExistingData() {
    console.log('🧹 Clearing existing data...');
    const { sequelize } = require('../models');
    
    // Temporarily disable FK checks to allow truncation
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Clear in reverse order to respect foreign key constraints
    await models.Review.destroy({ where: {}, force: true, truncate: true });
    await models.OrderItem.destroy({ where: {}, force: true, truncate: true });
    await models.Order.destroy({ where: {}, force: true, truncate: true });
    await models.Coupon.destroy({ where: {}, force: true, truncate: true });
    await models.Product.destroy({ where: {}, force: true, truncate: true });
    await models.Category.destroy({ where: {}, force: true, truncate: true });
    await models.BusinessTiming.destroy({ where: {}, force: true, truncate: true });
    await models.Business.destroy({ where: {}, force: true, truncate: true });
    await models.User.destroy({ where: {}, force: true, truncate: true });
    
    // Re-enable FK checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Clear Firebase data
    const collections = ['active_orders', 'chats', 'order_history'];
    for (let collection of collections) {
      try {
        const snapshot = await db.collection(collection).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        if (snapshot.docs.length > 0) {
          await batch.commit();
        }
      } catch (error) {
        console.log(`No data to clear in ${collection}`);
      }
    }
    
    console.log('✅ Existing data cleared');
  }
}

module.exports = DummyDataSeeder;

