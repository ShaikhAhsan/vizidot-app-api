const multer = require('multer');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const PRODUCTS_DIR = path.join(UPLOAD_DIR, 'products');
const PRODUCTS_THUMBS_DIR = path.join(PRODUCTS_DIR, 'thumbs');
const CATEGORIES_DIR = path.join(UPLOAD_DIR, 'categories');
const CATEGORIES_THUMBS_DIR = path.join(CATEGORIES_DIR, 'thumbs');
const BRANDS_DIR = path.join(UPLOAD_DIR, 'brands');
const BRANDS_THUMBS_DIR = path.join(BRANDS_DIR, 'thumbs');

// Create directories if they don't exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(PRODUCTS_DIR, { recursive: true });
    await fs.mkdir(PRODUCTS_THUMBS_DIR, { recursive: true });
    await fs.mkdir(CATEGORIES_DIR, { recursive: true });
    await fs.mkdir(CATEGORIES_THUMBS_DIR, { recursive: true });
    await fs.mkdir(BRANDS_DIR, { recursive: true });
    await fs.mkdir(BRANDS_THUMBS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
};

// Initialize directories
ensureDirectories();

// Utility to resolve subfolder based on request
const resolveSubfolder = (req) => {
  const raw = (req.query.folder || '').toString().toLowerCase();
  if (raw === 'categories') return 'categories';
  if (raw === 'brands') return 'brands';
  return 'products';
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sub = resolveSubfolder(req);
    const dir = sub === 'categories' ? CATEGORIES_DIR : sub === 'brands' ? BRANDS_DIR : PRODUCTS_DIR;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Generate thumbnail in the same subdir as original (under thumbs/)
const generateThumbnail = async (originalPath, filename) => {
  try {
    const baseDir = path.dirname(originalPath);
    const thumbsDir = path.join(baseDir, 'thumbs');
    await fs.mkdir(thumbsDir, { recursive: true });
    const thumbPath = path.join(thumbsDir, `thumb-${filename}`);
    
    const image = await Jimp.read(originalPath);
    await image
      .cover(300, 300)
      .quality(80)
      .writeAsync(thumbPath);
    
    return `thumbs/thumb-${filename}`;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
};

// Process uploaded image, returning relative paths based on subfolder
const processImage = async (file) => {
  try {
    const filename = file.filename;
    const originalPath = file.path;
    const subFolder = path.relative(UPLOAD_DIR, path.dirname(originalPath)); // e.g., products | categories | brands
    
    // Resize main image to 1000x1000px while maintaining aspect ratio
    const image = await Jimp.read(originalPath);
    await image
      .contain(1000, 1000)
      .quality(90)
      .writeAsync(originalPath);
    
    // Generate thumbnail
    const thumbnailPath = await generateThumbnail(originalPath, filename);
    
    return {
      original: `${subFolder}/${filename}`,
      thumbnail: `${subFolder}/${thumbnailPath}`,
      filename: filename,
      size: file.size,
      mimetype: file.mimetype
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

// Delete file from filesystem
const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    await fs.unlink(fullPath);
    console.log(`Deleted file: ${fullPath}`);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Delete multiple files
const deleteFiles = async (filePaths) => {
  try {
    const deletePromises = filePaths.map(filePath => deleteFile(filePath));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting files:', error);
  }
};

// Clean up old files when updating
const cleanupOldFiles = async (oldImages, newImages) => {
  try {
    const oldPaths = oldImages.map(img => img.original);
    const newPaths = newImages.map(img => img.original);
    
    const filesToDelete = oldPaths.filter(path => !newPaths.includes(path));
    
    if (filesToDelete.length > 0) {
      await deleteFiles(filesToDelete);
      // Also delete thumbnails
      const thumbPaths = filesToDelete.map(path => 
        path.replace('products/', 'products/thumbs/thumb-')
      );
      await deleteFiles(thumbPaths);
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
};

// Get file URL for serving
const getFileUrl = (filePath) => {
  return `/uploads/${filePath}`;
};

module.exports = {
  upload,
  processImage,
  deleteFile,
  deleteFiles,
  cleanupOldFiles,
  getFileUrl,
  ensureDirectories
};
