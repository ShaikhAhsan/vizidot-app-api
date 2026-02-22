const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadToGCS, isGCSAvailable } = require('./googleCloudStorage');

// Lazy load ffmpeg dependencies to avoid startup errors
let ffmpeg = null;
let ffmpegInitialized = false;

const initializeFFmpeg = () => {
  if (ffmpegInitialized) return ffmpeg;
  
  try {
    ffmpeg = require('fluent-ffmpeg');
    const ffmpegStatic = require('ffmpeg-static');
    const ffprobeStatic = require('ffprobe-static');
    
    // Set ffmpeg and ffprobe paths
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic);
    }
    if (ffprobeStatic && ffprobeStatic.path) {
      ffmpeg.setFfprobePath(ffprobeStatic.path);
    }
    
    ffmpegInitialized = true;
    return ffmpeg;
  } catch (error) {
    console.warn('⚠️  FFmpeg dependencies not available. Media processing features will be limited.', error.message);
    ffmpegInitialized = true; // Mark as initialized even if failed to prevent retries
    return null;
  }
};

/**
 * Get file extension from MIME type
 * @param {string} mimetype - MIME type
 * @returns {string} File extension
 */
const getFileExtension = (mimetype) => {
  const mimeMap = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/aac': 'aac',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm'
  };
  return mimeMap[mimetype] || 'mp4';
};

/**
 * Extract duration from audio or video file
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimetype - File MIME type
 * @returns {Promise<number>} Duration in seconds
 */
const extractDuration = (fileBuffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const ffmpegInstance = initializeFFmpeg();
    if (!ffmpegInstance) {
      reject(new Error('FFmpeg is not available'));
      return;
    }
    
    // Create a temporary file path (we'll use a stream approach)
    const fs = require('fs');
    const os = require('os');
    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, `${uuidv4()}-${Date.now()}.${getFileExtension(mimetype)}`);
    
    // Write buffer to temp file
    fs.writeFileSync(tmpFilePath, fileBuffer);
    
    ffmpegInstance(tmpFilePath)
      .ffprobe((err, metadata) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tmpFilePath);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
        
        if (err) {
          console.error('Error extracting duration:', err);
          reject(err);
          return;
        }
        
        const duration = metadata.format.duration;
        if (duration) {
          resolve(Math.floor(duration)); // Return duration in seconds as integer
        } else {
          reject(new Error('Could not extract duration from file'));
        }
      });
  });
};

/**
 * Extract thumbnail from video file
 * @param {Buffer} fileBuffer - Video file buffer
 * @param {string} mimetype - File MIME type
 * @param {number} timestamp - Timestamp in seconds (default: 1 second)
 * @returns {Promise<Buffer>} Thumbnail image buffer
 */
const extractThumbnail = (fileBuffer, mimetype, timestamp = 1) => {
  return new Promise((resolve, reject) => {
    const ffmpegInstance = initializeFFmpeg();
    if (!ffmpegInstance) {
      reject(new Error('FFmpeg is not available'));
      return;
    }
    
    const fs = require('fs');
    const os = require('os');
    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, `${uuidv4()}-${Date.now()}.${getFileExtension(mimetype)}`);
    const thumbnailPath = path.join(tmpDir, `${uuidv4()}-thumbnail.jpg`);
    
    // Write buffer to temp file
    fs.writeFileSync(tmpFilePath, fileBuffer);
    
    ffmpegInstance(tmpFilePath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '640x360' // 16:9 aspect ratio
      })
      .on('end', () => {
        try {
          // Read thumbnail file
          const thumbnailBuffer = fs.readFileSync(thumbnailPath);
          
          // Clean up temp files
          fs.unlinkSync(tmpFilePath);
          fs.unlinkSync(thumbnailPath);
          
          resolve(thumbnailBuffer);
        } catch (error) {
          // Clean up on error
          try {
            fs.unlinkSync(tmpFilePath);
            if (fs.existsSync(thumbnailPath)) {
              fs.unlinkSync(thumbnailPath);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up temp files:', cleanupError);
          }
          reject(error);
        }
      })
      .on('error', (err) => {
        // Clean up on error
        try {
          fs.unlinkSync(tmpFilePath);
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temp files:', cleanupError);
        }
        console.error('Error extracting thumbnail:', err);
        reject(err);
      });
  });
};

/**
 * Process media file: extract duration and thumbnail (for videos)
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {string} type - 'audio' or 'video'
 * @returns {Promise<{duration: number, thumbnailUrl: string|null}>}
 */
const processMediaFile = async (fileBuffer, mimetype, type) => {
  const result = {
    duration: null,
    thumbnailUrl: null
  };

  try {
    // Extract duration for both audio and video
    result.duration = await extractDuration(fileBuffer, mimetype);
    console.log(`Extracted duration: ${result.duration} seconds`);
  } catch (error) {
    console.error('Failed to extract duration:', error);
    // Continue without duration if extraction fails
  }

  // Extract thumbnail only for video files (audio thumbnails can be uploaded manually)
  if (type === 'video') {
    try {
      const thumbnailBuffer = await extractThumbnail(fileBuffer, mimetype, 1);
      
      if (thumbnailBuffer && isGCSAvailable()) {
        // Upload thumbnail to Firebase Storage
        const thumbnailFileName = `${uuidv4()}-${Date.now()}.jpg`;
        const uploadResult = await uploadToGCS(
          thumbnailBuffer,
          thumbnailFileName,
          'video-thumbnails',
          'image/jpeg'
        );
        
        result.thumbnailUrl = uploadResult.url;
        console.log('Thumbnail extracted and uploaded:', result.thumbnailUrl);
      }
    } catch (error) {
      console.error('Failed to extract thumbnail:', error);
      // Continue without thumbnail if extraction fails
    }
  }

  return result;
};

module.exports = {
  extractDuration,
  extractThumbnail,
  processMediaFile
};

