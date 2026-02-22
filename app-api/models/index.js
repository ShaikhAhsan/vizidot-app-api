const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Role = require('./Role');
const UserRole = require('./UserRole');
const Business = require('./Business');
const BusinessTiming = require('./BusinessTiming');
const Category = require('./Category');
const Product = require('./Product');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Coupon = require('./Coupon');
const Review = require('./Review');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Brand = require('./Brand');
const Tag = require('./Tag');
const ProductTag = require('./ProductTag');
const ProductCategory = require('./ProductCategory');
const Unit = require('./Unit');

// Music Platform Models
const Artist = require('./Artist');
const ArtistBranding = require('./ArtistBranding');
const ArtistShop = require('./ArtistShop');
const Album = require('./Album');
const AudioTrack = require('./AudioTrack');
const VideoTrack = require('./VideoTrack');
const AlbumArtist = require('./AlbumArtist');
const TrackArtist = require('./TrackArtist');
const BrandingArtist = require('./BrandingArtist');
const ShopArtist = require('./ShopArtist');
const UserArtist = require('./UserArtist');
const ArtistFollower = require('./ArtistFollower');
const UserFavourite = require('./UserFavourite');
const PlayHistory = require('./PlayHistory');
const MusicCategory = require('./MusicCategory');
const UserMusicCategory = require('./UserMusicCategory');
const UserSettings = require('./UserSettings');
const AppSetting = require('./AppSetting');

// Define associations
const defineAssociations = () => {
  // User associations
  User.hasMany(Business, { foreignKey: 'user_id', as: 'businesses' });
  User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
  User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
  User.hasMany(Cart, { foreignKey: 'user_id', as: 'carts' });
  
  // User favourites (albums, tracks, videos)
  User.hasMany(UserFavourite, { foreignKey: 'user_id', as: 'favourites' });
  UserFavourite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(PlayHistory, { foreignKey: 'user_id', as: 'playHistory' });
  PlayHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  User.hasMany(UserMusicCategory, { foreignKey: 'user_id', as: 'userMusicCategories' });
  UserMusicCategory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserMusicCategory.belongsTo(MusicCategory, { foreignKey: 'music_category_id', as: 'musicCategory' });
  MusicCategory.hasMany(UserMusicCategory, { foreignKey: 'music_category_id', as: 'userSelections' });

  User.hasOne(UserSettings, { foreignKey: 'user_id', as: 'settings' });
  UserSettings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // User-Artist associations (many-to-many)
  User.belongsToMany(Artist, {
    through: UserArtist,
    foreignKey: 'user_id',
    otherKey: 'artist_id',
    as: 'artists'
  });
  Artist.belongsToMany(User, {
    through: UserArtist,
    foreignKey: 'artist_id',
    otherKey: 'user_id',
    as: 'users'
  });

  // Artist followers (user follows artist)
  User.hasMany(ArtistFollower, { foreignKey: 'user_id', as: 'artistFollows' });
  Artist.hasMany(ArtistFollower, { foreignKey: 'artist_id', as: 'followers' });
  ArtistFollower.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  ArtistFollower.belongsTo(Artist, { foreignKey: 'artist_id', as: 'artist' });
  
  // RBAC associations
  User.belongsToMany(Role, { 
    through: UserRole, 
    foreignKey: 'user_id', 
    otherKey: 'role_id',
    as: 'roles'
  });
  Role.belongsToMany(User, { 
    through: UserRole, 
    foreignKey: 'role_id', 
    otherKey: 'user_id',
    as: 'users'
  });
  UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  UserRole.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

  // Business associations
  Business.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });
  Business.hasMany(BusinessTiming, { foreignKey: 'business_id', as: 'timings' });
  Business.hasMany(Category, { foreignKey: 'business_id', as: 'categories' });
  Business.hasMany(Product, { foreignKey: 'business_id', as: 'products' });
  Business.hasMany(Order, { foreignKey: 'business_id', as: 'orders' });
  Business.hasMany(Coupon, { foreignKey: 'creator_id', as: 'coupons' });
  Business.hasMany(Review, { foreignKey: 'business_id', as: 'reviews' });

  // BusinessTiming associations
  BusinessTiming.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });

  // Category associations
  Category.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });
  Category.belongsToMany(Product, { 
    through: ProductCategory, 
    foreignKey: 'category_id', 
    otherKey: 'product_id',
    as: 'products'
  });

  // Product associations
  Product.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });
  Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });
  Product.belongsToMany(Category, { 
    through: ProductCategory, 
    foreignKey: 'product_id', 
    otherKey: 'category_id',
    as: 'categories'
  });
  Product.belongsToMany(Tag, { 
    through: ProductTag, 
    foreignKey: 'product_id', 
    otherKey: 'tag_id',
    as: 'tags'
  });
  Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
  Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
  Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cartItems' });

  // Order associations
  Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Order.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });
  Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
  Order.hasMany(Review, { foreignKey: 'order_id', as: 'reviews' });

  // OrderItem associations
  OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
  OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // Coupon associations
  Coupon.belongsTo(Business, { foreignKey: 'creator_id', as: 'creator' });

  // Review associations
  Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  Review.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });
  Review.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

  // Cart associations
  Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Cart.belongsTo(Business, { foreignKey: 'business_id', as: 'business' });
  Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });

  // CartItem associations
  CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });
  CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // Brand associations
  Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });

  // Tag associations
  Tag.belongsToMany(Product, { 
    through: ProductTag, 
    foreignKey: 'tag_id', 
    otherKey: 'product_id',
    as: 'products'
  });

  // ProductTag associations
  ProductTag.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  ProductTag.belongsTo(Tag, { foreignKey: 'tag_id', as: 'tag' });

  // ProductCategory associations
  ProductCategory.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  ProductCategory.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

  // Music Platform Associations
  // Artist associations
  Artist.hasMany(Album, { foreignKey: 'artist_id', as: 'albums' });
  Artist.belongsToMany(ArtistBranding, { 
    through: BrandingArtist, 
    foreignKey: 'artist_id', 
    otherKey: 'branding_id',
    as: 'brandings'
  });
  Artist.belongsTo(ArtistShop, { 
    foreignKey: 'shop_id', 
    as: 'shop'
  });
  Artist.belongsToMany(Album, { 
    through: AlbumArtist, 
    foreignKey: 'artist_id', 
    otherKey: 'album_id',
    as: 'collaboratedAlbums'
  });
  Artist.belongsToMany(AudioTrack, { 
    through: { model: TrackArtist, scope: { track_type: 'audio' } }, 
    foreignKey: 'artist_id', 
    otherKey: 'track_id',
    as: 'audioTrackCollaborations',
    constraints: false
  });
  Artist.belongsToMany(VideoTrack, { 
    through: { model: TrackArtist, scope: { track_type: 'video' } }, 
    foreignKey: 'artist_id', 
    otherKey: 'track_id',
    as: 'videoTrackCollaborations',
    constraints: false
  });

  // ArtistBranding associations
  ArtistBranding.belongsTo(Artist, { foreignKey: 'artist_id', as: 'primaryArtist', required: false });
  ArtistBranding.belongsToMany(Artist, { 
    through: BrandingArtist, 
    foreignKey: 'branding_id', 
    otherKey: 'artist_id',
    as: 'artists'
  });
  ArtistBranding.hasMany(ArtistShop, { foreignKey: 'branding_id', as: 'shops' });
  ArtistBranding.hasMany(Album, { foreignKey: 'branding_id', as: 'albums' });

  // ArtistShop associations
  ArtistShop.belongsTo(Artist, { foreignKey: 'artist_id', as: 'primaryArtist', required: false });
  ArtistShop.hasMany(Artist, { 
    foreignKey: 'shop_id', 
    as: 'artists'
  });
  ArtistShop.belongsToMany(Artist, { 
    through: ShopArtist, 
    foreignKey: 'shop_id', 
    otherKey: 'artist_id',
    as: 'assignedArtists' // Keep junction table for backward compatibility or additional assignments
  });
  ArtistShop.belongsTo(ArtistBranding, { foreignKey: 'branding_id', as: 'branding' });

  // Album associations
  Album.belongsTo(Artist, { foreignKey: 'artist_id', as: 'artist' });
  Album.belongsTo(ArtistBranding, { foreignKey: 'branding_id', as: 'branding' });
  Album.hasMany(AudioTrack, { foreignKey: 'album_id', as: 'audioTracks' });
  Album.hasMany(VideoTrack, { foreignKey: 'album_id', as: 'videoTracks' });
  Album.belongsToMany(Artist, { 
    through: AlbumArtist, 
    foreignKey: 'album_id', 
    otherKey: 'artist_id',
    as: 'collaboratingArtists'
  });

  // AudioTrack associations
  AudioTrack.belongsTo(Album, { foreignKey: 'album_id', as: 'album' });
  AudioTrack.belongsToMany(Artist, { 
    through: { model: TrackArtist, scope: { track_type: 'audio' } }, 
    foreignKey: 'track_id', 
    otherKey: 'artist_id',
    as: 'collaboratingArtists',
    constraints: false
  });

  // VideoTrack associations
  VideoTrack.belongsTo(Album, { foreignKey: 'album_id', as: 'album' });
  VideoTrack.belongsToMany(Artist, { 
    through: { model: TrackArtist, scope: { track_type: 'video' } }, 
    foreignKey: 'track_id', 
    otherKey: 'artist_id',
    as: 'collaboratingArtists',
    constraints: false
  });

  // AlbumArtist associations
  AlbumArtist.belongsTo(Album, { foreignKey: 'album_id', as: 'album' });
  AlbumArtist.belongsTo(Artist, { foreignKey: 'artist_id', as: 'artist' });

  // TrackArtist associations
  TrackArtist.belongsTo(Artist, { foreignKey: 'artist_id', as: 'artist' });

  // BrandingArtist associations
  BrandingArtist.belongsTo(ArtistBranding, { foreignKey: 'branding_id', as: 'branding' });
  BrandingArtist.belongsTo(Artist, { foreignKey: 'artist_id', as: 'artist' });

  // ShopArtist associations
  ShopArtist.belongsTo(ArtistShop, { foreignKey: 'shop_id', as: 'shop' });
  ShopArtist.belongsTo(Artist, { foreignKey: 'artist_id', as: 'artist' });

  // UserArtist associations
  UserArtist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserArtist.belongsTo(Artist, { foreignKey: 'artist_id', as: 'artist' });
};

// Initialize associations
defineAssociations();

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Business,
  BusinessTiming,
  Category,
  Product,
  Order,
  OrderItem,
  Coupon,
  Review,
  Cart,
  CartItem,
  Brand,
  Tag,
  ProductTag,
  ProductCategory,
  Unit,
  // Music Platform Models
  Artist,
  ArtistBranding,
  ArtistShop,
  Album,
  AudioTrack,
  VideoTrack,
  AlbumArtist,
  TrackArtist,
  BrandingArtist,
  ShopArtist,
  UserArtist,
  ArtistFollower,
  UserFavourite,
  PlayHistory,
  MusicCategory,
  UserMusicCategory,
  UserSettings,
  AppSetting
};

