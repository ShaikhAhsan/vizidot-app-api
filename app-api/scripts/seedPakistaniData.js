const { sequelize } = require('../config/database');
const {
  User,
  Business,
  BusinessTiming,
  Category,
  Product,
  Order,
  OrderItem,
  Coupon,
  Review,
  Cart,
  CartItem
} = require('../models');

// Pakistani cities and areas
const pakistaniCities = [
  { city: 'Karachi', areas: ['DHA', 'Clifton', 'Gulshan-e-Iqbal', 'North Nazimabad', 'Malir', 'Korangi'] },
  { city: 'Lahore', areas: ['DHA Phase 1', 'DHA Phase 2', 'Gulberg', 'Johar Town', 'Model Town', 'Cantt'] },
  { city: 'Islamabad', areas: ['F-8', 'F-10', 'G-9', 'G-11', 'DHA Phase 1', 'Blue Area'] },
  { city: 'Rawalpindi', areas: ['Saddar', 'Raja Bazaar', 'Chaklala', 'Westridge', 'Bahria Town'] },
  { city: 'Faisalabad', areas: ['D Ground', 'Jinnah Colony', 'Madina Town', 'Satiana Road'] },
  { city: 'Multan', areas: ['Cantt', 'Bosan Road', 'Shah Rukn-e-Alam', 'Gulgasht'] }
];

// Pakistani names
const pakistaniNames = {
  male: [
    'Ahmed Ali', 'Muhammad Hassan', 'Ali Raza', 'Usman Khan', 'Bilal Ahmed', 'Saad Malik',
    'Hamza Sheikh', 'Omar Farooq', 'Zain Abbas', 'Hassan Rizvi', 'Taha Khan', 'Arslan Ali',
    'Fahad Ahmed', 'Waseem Khan', 'Noman Sheikh', 'Rizwan Ali', 'Shahid Khan', 'Imran Malik'
  ],
  female: [
    'Ayesha Khan', 'Fatima Ali', 'Zainab Ahmed', 'Maryam Sheikh', 'Hira Malik', 'Sara Khan',
    'Amina Ali', 'Khadija Ahmed', 'Sumaira Khan', 'Nida Sheikh', 'Rabia Ali', 'Saima Khan',
    'Bushra Ahmed', 'Nazia Ali', 'Shazia Khan', 'Farah Sheikh', 'Sadia Ali', 'Noreen Khan'
  ]
};

// Pakistani business names
const businessNames = [
  'Al-Noor Restaurant', 'Shalimar Foods', 'Karachi Kitchen', 'Lahore Delights', 'Islamabad Bites',
  'Pakistani Spice', 'Desi Dhaba', 'Royal Kitchen', 'Golden Spoon', 'Taste of Pakistan',
  'Fresh Mart', 'Daily Grocery', 'Super Store', 'City Mart', 'Family Store',
  'Quick Shop', '24/7 Store', 'Neighborhood Mart', 'Budget Store', 'Premium Grocery'
];

// Pakistani product categories
const categories = [
  { name: 'Rice & Grains', slug: 'rice-grains', description: 'Basmati rice, wheat flour, and other grains' },
  { name: 'Spices & Masala', slug: 'spices-masala', description: 'Traditional Pakistani spices and masala mixes' },
  { name: 'Dairy Products', slug: 'dairy-products', description: 'Milk, yogurt, cheese, and dairy items' },
  { name: 'Meat & Poultry', slug: 'meat-poultry', description: 'Fresh meat, chicken, and poultry products' },
  { name: 'Vegetables', slug: 'vegetables', description: 'Fresh seasonal vegetables' },
  { name: 'Fruits', slug: 'fruits', description: 'Fresh seasonal fruits' },
  { name: 'Bakery Items', slug: 'bakery-items', description: 'Bread, naan, and baked goods' },
  { name: 'Beverages', slug: 'beverages', description: 'Tea, coffee, juices, and soft drinks' },
  { name: 'Snacks', slug: 'snacks', description: 'Pakistani snacks and mithai' },
  { name: 'Household Items', slug: 'household-items', description: 'Cleaning supplies and household essentials' }
];

// Pakistani products with realistic pricing (in PKR)
const products = [
  // Rice & Grains
  { name: 'Basmati Rice (5kg)', price: 1200, category: 'rice-grains', unit: 'bag' },
  { name: 'Wheat Flour (10kg)', price: 800, category: 'rice-grains', unit: 'bag' },
  { name: 'Chana Dal (1kg)', price: 180, category: 'rice-grains', unit: 'kg' },
  { name: 'Moong Dal (1kg)', price: 200, category: 'rice-grains', unit: 'kg' },
  
  // Spices & Masala
  { name: 'Red Chili Powder (250g)', price: 120, category: 'spices-masala', unit: 'packet' },
  { name: 'Turmeric Powder (250g)', price: 80, category: 'spices-masala', unit: 'packet' },
  { name: 'Garam Masala (100g)', price: 150, category: 'spices-masala', unit: 'packet' },
  { name: 'Cumin Seeds (100g)', price: 60, category: 'spices-masala', unit: 'packet' },
  
  // Dairy Products
  { name: 'Fresh Milk (1 liter)', price: 120, category: 'dairy-products', unit: 'liter' },
  { name: 'Yogurt (500g)', price: 80, category: 'dairy-products', unit: 'packet' },
  { name: 'Butter (250g)', price: 200, category: 'dairy-products', unit: 'packet' },
  { name: 'Cheese (200g)', price: 180, category: 'dairy-products', unit: 'packet' },
  
  // Meat & Poultry
  { name: 'Chicken (1kg)', price: 400, category: 'meat-poultry', unit: 'kg' },
  { name: 'Beef (1kg)', price: 600, category: 'meat-poultry', unit: 'kg' },
  { name: 'Mutton (1kg)', price: 800, category: 'meat-poultry', unit: 'kg' },
  { name: 'Fish (1kg)', price: 500, category: 'meat-poultry', unit: 'kg' },
  
  // Vegetables
  { name: 'Onions (1kg)', price: 60, category: 'vegetables', unit: 'kg' },
  { name: 'Tomatoes (1kg)', price: 80, category: 'vegetables', unit: 'kg' },
  { name: 'Potatoes (1kg)', price: 50, category: 'vegetables', unit: 'kg' },
  { name: 'Green Chilies (250g)', price: 40, category: 'vegetables', unit: 'packet' },
  
  // Fruits
  { name: 'Mangoes (1kg)', price: 200, category: 'fruits', unit: 'kg' },
  { name: 'Bananas (1 dozen)', price: 100, category: 'fruits', unit: 'dozen' },
  { name: 'Apples (1kg)', price: 300, category: 'fruits', unit: 'kg' },
  { name: 'Oranges (1kg)', price: 150, category: 'fruits', unit: 'kg' },
  
  // Bakery Items
  { name: 'Fresh Naan (4 pieces)', price: 60, category: 'bakery-items', unit: 'packet' },
  { name: 'White Bread (1 loaf)', price: 40, category: 'bakery-items', unit: 'loaf' },
  { name: 'Roti (10 pieces)', price: 50, category: 'bakery-items', unit: 'packet' },
  { name: 'Biscuits (200g)', price: 80, category: 'bakery-items', unit: 'packet' },
  
  // Beverages
  { name: 'Tea Leaves (250g)', price: 200, category: 'beverages', unit: 'packet' },
  { name: 'Coffee (200g)', price: 300, category: 'beverages', unit: 'packet' },
  { name: 'Orange Juice (1 liter)', price: 150, category: 'beverages', unit: 'bottle' },
  { name: 'Coca Cola (1.5 liter)', price: 120, category: 'beverages', unit: 'bottle' },
  
  // Snacks
  { name: 'Pakistani Mithai (500g)', price: 400, category: 'snacks', unit: 'box' },
  { name: 'Namkeen Mix (200g)', price: 100, category: 'snacks', unit: 'packet' },
  { name: 'Biscuits (300g)', price: 120, category: 'snacks', unit: 'packet' },
  { name: 'Chips (150g)', price: 80, category: 'snacks', unit: 'packet' },
  
  // Household Items
  { name: 'Dish Soap (500ml)', price: 150, category: 'household-items', unit: 'bottle' },
  { name: 'Laundry Detergent (1kg)', price: 200, category: 'household-items', unit: 'packet' },
  { name: 'Toilet Paper (4 rolls)', price: 120, category: 'household-items', unit: 'pack' },
  { name: 'Cleaning Cloth (5 pieces)', price: 80, category: 'household-items', unit: 'pack' }
];

// Pakistani phone numbers
const generatePakistaniPhone = () => {
  const prefixes = ['300', '301', '302', '303', '304', '305', '306', '307', '308', '309',
                   '310', '311', '312', '313', '314', '315', '316', '317', '318', '319',
                   '320', '321', '322', '323', '324', '325', '326', '327', '328', '329',
                   '330', '331', '332', '333', '334', '335', '336', '337', '338', '339',
                   '340', '341', '342', '343', '344', '345', '346', '347', '348', '349'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+92${prefix}${number}`;
};

// Generate random Pakistani address
const generatePakistaniAddress = () => {
  const cityData = pakistaniCities[Math.floor(Math.random() * pakistaniCities.length)];
  const area = cityData.areas[Math.floor(Math.random() * cityData.areas.length)];
  const streetNumber = Math.floor(Math.random() * 200) + 1;
  const houseNumber = Math.floor(Math.random() * 50) + 1;
  
  return {
    street: `House ${houseNumber}, Street ${streetNumber}`,
    area: area,
    city: cityData.city,
    province: cityData.city === 'Karachi' ? 'Sindh' : 
              cityData.city === 'Lahore' || cityData.city === 'Faisalabad' || cityData.city === 'Multan' ? 'Punjab' :
              cityData.city === 'Islamabad' || cityData.city === 'Rawalpindi' ? 'Punjab' : 'Punjab',
    postalCode: Math.floor(Math.random() * 90000) + 10000,
    country: 'Pakistan'
  };
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting Pakistani data seeding...');

    // Clear existing data
    await sequelize.sync({ force: true });
    console.log('🗑️  Cleared existing data');

    // Create users
    console.log('👥 Creating users...');
    const users = [];
    
    // Create admin user
    const adminUser = await User.create({
      firebase_uid: 'admin-001',
      email: 'admin@ebazar.pk',
      first_name: 'Admin',
      last_name: 'User',
      phone: generatePakistaniPhone(),
      user_type: 'admin',
      is_verified: true,
      is_active: true,
      address: generatePakistaniAddress(),
      preferences: { language: 'ur', currency: 'PKR' }
    });
    users.push(adminUser);

    // Create business owners
    for (let i = 0; i < 10; i++) {
      const isMale = Math.random() > 0.5;
      const names = isMale ? pakistaniNames.male : pakistaniNames.female;
      const fullName = names[Math.floor(Math.random() * names.length)].split(' ');
      
      const user = await User.create({
        firebase_uid: `business-owner-${i + 1}`,
        email: `owner${i + 1}@ebazar.pk`,
        first_name: fullName[0],
        last_name: fullName[1] || '',
        phone: generatePakistaniPhone(),
        user_type: 'business',
        is_verified: true,
        is_active: true,
        address: generatePakistaniAddress(),
        preferences: { language: 'ur', currency: 'PKR' }
      });
      users.push(user);
    }

    // Create customers
    for (let i = 0; i < 50; i++) {
      const isMale = Math.random() > 0.5;
      const names = isMale ? pakistaniNames.male : pakistaniNames.female;
      const fullName = names[Math.floor(Math.random() * names.length)].split(' ');
      
      const user = await User.create({
        firebase_uid: `customer-${i + 1}`,
        email: `customer${i + 1}@gmail.com`,
        first_name: fullName[0],
        last_name: fullName[1] || '',
        phone: generatePakistaniPhone(),
        user_type: 'customer',
        is_verified: Math.random() > 0.3,
        is_active: true,
        address: generatePakistaniAddress(),
        preferences: { language: 'ur', currency: 'PKR' }
      });
      users.push(user);
    }

    console.log(`✅ Created ${users.length} users`);

    // Create businesses
    console.log('🏪 Creating businesses...');
    const businesses = [];
    const businessOwners = users.filter(u => u.user_type === 'business');
    
    for (let i = 0; i < businessOwners.length; i++) {
      const owner = businessOwners[i];
      const businessName = businessNames[i % businessNames.length];
      const businessTypes = ['grocery', 'restaurant', 'pharmacy', 'electronics', 'clothing'];
      const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
      
      const business = await Business.create({
        user_id: owner.id,
        business_name: businessName,
        business_slug: businessName.toLowerCase().replace(/\s+/g, '-'),
        description: `Quality ${businessType} services in Pakistan`,
        contact_phone: generatePakistaniPhone(),
        contact_email: `info@${businessName.toLowerCase().replace(/\s+/g, '')}.pk`,
        address: `${generatePakistaniAddress().street}, ${generatePakistaniAddress().area}, ${generatePakistaniAddress().city}`,
        latitude: 24.8607 + (Math.random() - 0.5) * 0.1, // Around Karachi
        longitude: 67.0011 + (Math.random() - 0.5) * 0.1,
        delivery_radius: Math.floor(Math.random() * 15) + 5,
        delivery_fee: Math.floor(Math.random() * 100) + 50,
        min_order_amount: Math.floor(Math.random() * 500) + 200,
        is_verified: Math.random() > 0.2,
        is_active: true,
        rating: Math.random() * 2 + 3, // 3-5 stars
        total_reviews: Math.floor(Math.random() * 100),
        business_type: businessType,
        payment_methods: ['cash_on_delivery', 'credit_card', 'bank_transfer'],
        features: ['fast_delivery', 'fresh_products', 'customer_support']
      });
      businesses.push(business);
    }

    console.log(`✅ Created ${businesses.length} businesses`);

    // Create business timings
    console.log('⏰ Creating business timings...');
    for (const business of businesses) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      for (let day = 0; day < 7; day++) {
        await BusinessTiming.create({
          business_id: business.id,
          day_of_week: day,
          opening_time: '09:00:00',
          closing_time: '22:00:00',
          is_24_hours: false,
          is_closed: day === 6 && Math.random() > 0.5 // Some businesses closed on Sunday
        });
      }
    }

    // Create categories
    console.log('📂 Creating categories...');
    const categoryRecords = [];
    for (const category of categories) {
      const business = businesses[Math.floor(Math.random() * businesses.length)];
      const categoryRecord = await Category.create({
        business_id: business.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        sort_order: Math.floor(Math.random() * 100),
        is_active: true
      });
      categoryRecords.push(categoryRecord);
    }

    console.log(`✅ Created ${categoryRecords.length} categories`);

    // Create products
    console.log('🛍️ Creating products...');
    const productRecords = [];
    for (const product of products) {
      const business = businesses[Math.floor(Math.random() * businesses.length)];
      const category = categoryRecords.find(c => c.slug === product.category);
      
      const productRecord = await Product.create({
        business_id: business.id,
        category_id: category ? category.id : null,
        sku: `PK-${Math.floor(Math.random() * 100000)}`,
        name: product.name,
        slug: product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: `High quality ${product.name} from Pakistan`,
        short_description: `Fresh ${product.name}`,
        price: product.price,
        old_price: product.price * (1 + Math.random() * 0.2), // 20% higher old price
        cost_price: product.price * 0.7, // 30% margin
        stock_quantity: Math.floor(Math.random() * 100) + 10,
        min_stock_alert: 5,
        max_quantity_per_order: Math.floor(Math.random() * 10) + 5,
        unit: product.unit,
        weight: Math.random() * 2 + 0.5, // 0.5-2.5 kg
        is_active: true,
        is_verified: Math.random() > 0.1,
        is_featured: Math.random() > 0.7,
        rating: Math.random() * 2 + 3, // 3-5 stars
        total_reviews: Math.floor(Math.random() * 50),
        total_sales: Math.floor(Math.random() * 200),
        tags: ['pakistani', 'fresh', 'quality']
      });
      productRecords.push(productRecord);
    }

    console.log(`✅ Created ${productRecords.length} products`);

    // Create orders
    console.log('📦 Creating orders...');
    const customers = users.filter(u => u.user_type === 'customer');
    const orders = [];
    
    for (let i = 0; i < 100; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const business = businesses[Math.floor(Math.random() * businesses.length)];
      const orderStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
      const paymentStatuses = ['pending', 'paid', 'failed'];
      const deliveryTypes = ['quick', 'convenience', 'next_day'];
      
      const order = await Order.create({
        user_id: customer.id,
        business_id: business.id,
        order_number: `PK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        order_status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
        subtotal_amount: Math.floor(Math.random() * 2000) + 500,
        delivery_fee: business.delivery_fee,
        discount_amount: Math.floor(Math.random() * 200),
        tax_amount: Math.floor(Math.random() * 100),
        total_amount: 0, // Will be calculated
        delivery_type: deliveryTypes[Math.floor(Math.random() * deliveryTypes.length)],
        delivery_address: generatePakistaniAddress(),
        delivery_instructions: 'Please call before delivery',
        customer_notes: 'Handle with care',
        payment_status: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
        payment_method: 'cash_on_delivery',
        estimated_preparation_time: Math.floor(Math.random() * 60) + 15
      });

      // Update total amount
      order.total_amount = order.subtotal_amount + order.delivery_fee - order.discount_amount + order.tax_amount;
      await order.save();
      
      orders.push(order);
    }

    console.log(`✅ Created ${orders.length} orders`);

    // Create order items
    console.log('📋 Creating order items...');
    for (const order of orders) {
      const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 items per order
      const orderProducts = productRecords.slice(0, numItems);
      
      for (const product of orderProducts) {
        const quantity = Math.floor(Math.random() * 3) + 1;
        const productPrice = product.price;
        const totalPrice = productPrice * quantity;
        const appliedDiscount = Math.floor(Math.random() * 50);
        const finalPrice = totalPrice - appliedDiscount;
        
        await OrderItem.create({
          order_id: order.id,
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_price: productPrice,
          quantity: quantity,
          total_price: totalPrice,
          applied_discount: appliedDiscount,
          final_price: finalPrice,
          product_image: '/images/placeholder.jpg',
          product_description: product.description,
          product_weight: product.weight,
          product_unit: product.unit,
          is_fulfilled: Math.random() > 0.3
        });
      }
    }

    // Create coupons
    console.log('🎫 Creating coupons...');
    const couponCodes = ['WELCOME10', 'SAVE20', 'NEWUSER15', 'FIRSTORDER', 'PAKISTAN25'];
    for (let i = 0; i < 5; i++) {
      const business = businesses[Math.floor(Math.random() * businesses.length)];
      await Coupon.create({
        code: couponCodes[i],
        name: `Special Offer ${i + 1}`,
        description: 'Great discount for Pakistani customers',
        coupon_type: 'percentage',
        discount_value: 10 + (i * 5), // 10%, 15%, 20%, 25%, 30%
        max_discount_amount: 500,
        min_order_amount: 1000,
        usage_limit: 100,
        usage_count: Math.floor(Math.random() * 50),
        used_by_user_limit: 1,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        is_active: true,
        created_by: 'admin',
        creator_id: business.id,
        scope_type: 'business',
        scope_ids: [business.id],
        terms_and_conditions: 'Valid for Pakistani customers only'
      });
    }

    // Create reviews
    console.log('⭐ Creating reviews...');
    const reviewTexts = [
      'بہت اچھا سامان ہے', 'Excellent quality', 'Fast delivery', 'Good service',
      'قیمت مناسب ہے', 'Fresh products', 'Recommended', 'بہترین سروس'
    ];
    
    for (let i = 0; i < 200; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const product = productRecords[Math.floor(Math.random() * productRecords.length)];
      const order = orders[Math.floor(Math.random() * orders.length)];
      
      await Review.create({
        user_id: customer.id,
        product_id: product.id,
        business_id: product.business_id,
        order_id: order.id,
        rating: Math.floor(Math.random() * 5) + 1,
        title: 'Great Product',
        comment: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
        is_verified_purchase: Math.random() > 0.3,
        is_approved: Math.random() > 0.1,
        is_anonymous: Math.random() > 0.8,
        helpful_count: Math.floor(Math.random() * 10),
        review_type: 'product'
      });
    }

    // Create carts
    console.log('🛒 Creating carts...');
    for (let i = 0; i < 30; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const business = businesses[Math.floor(Math.random() * businesses.length)];
      
      const cart = await Cart.create({
        user_id: customer.id,
        business_id: business.id,
        subtotal: Math.floor(Math.random() * 1000) + 200,
        delivery_fee: business.delivery_fee,
        discount_amount: Math.floor(Math.random() * 100),
        tax_amount: Math.floor(Math.random() * 50),
        total_amount: 0, // Will be calculated
        delivery_address: generatePakistaniAddress(),
        delivery_type: 'convenience',
        is_abandoned: Math.random() > 0.7,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });

      // Update total amount
      cart.total_amount = cart.subtotal + cart.delivery_fee - cart.discount_amount + cart.tax_amount;
      await cart.save();
    }

    console.log('🎉 Pakistani data seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🏪 Businesses: ${businesses.length}`);
    console.log(`   📂 Categories: ${categoryRecords.length}`);
    console.log(`   🛍️ Products: ${productRecords.length}`);
    console.log(`   📦 Orders: ${orders.length}`);
    console.log(`   🎫 Coupons: 5`);
    console.log(`   ⭐ Reviews: 200`);
    console.log(`   🛒 Carts: 30`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
};

// Run the seeder
seedDatabase();
