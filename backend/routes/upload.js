const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eventease',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 630, crop: 'limit', quality: 'auto' }
    ]
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
router.post('/image', protect, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided'
    });
  }

  res.json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      image: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        format: req.file.format
      }
    }
  });
}));

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private
router.post('/images', protect, upload.array('images', 5), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No image files provided'
    });
  }

  const images = req.files.map(file => ({
    url: file.path,
    publicId: file.filename,
    originalName: file.originalname,
    size: file.size,
    format: file.format
  }));

  res.json({
    success: true,
    message: `${images.length} image(s) uploaded successfully`,
    data: { images }
  });
}));

// @desc    Upload avatar
// @route   POST /api/upload/avatar
// @access  Private
router.post('/avatar', protect, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No avatar file provided'
    });
  }

  // Update user's avatar in database
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, {
    avatar: req.file.path
  });

  res.json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: {
      avatar: {
        url: req.file.path,
        publicId: req.file.filename
      }
    }
  });
}));

// @desc    Upload event image
// @route   POST /api/upload/event-image
// @access  Private
router.post('/event-image', protect, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided'
    });
  }

  const { eventId } = req.body;

  if (eventId) {
    // Update event's image in database
    const Event = require('../models/Event');
    const event = await Event.findById(eventId);

    if (!event) {
      // Delete uploaded image if event not found
      await cloudinary.uploader.destroy(req.file.filename);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user can update this event
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      // Delete uploaded image if user can't update event
      await cloudinary.uploader.destroy(req.file.filename);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own events.'
      });
    }

    // Delete old image if exists
    if (event.image && event.image.publicId) {
      await cloudinary.uploader.destroy(event.image.publicId);
    }

    // Update event with new image
    event.image = {
      url: req.file.path,
      publicId: req.file.filename,
      alt: req.body.alt || event.title
    };
    await event.save();
  }

  res.json({
    success: true,
    message: 'Event image uploaded successfully',
    data: {
      image: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        format: req.file.format
      }
    }
  });
}));

// @desc    Delete image
// @route   DELETE /api/upload/:publicId
// @access  Private
router.delete('/:publicId', protect, asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  try {
    // Delete image from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'not found') {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image'
    });
  }
}));

// @desc    Get image info
// @route   GET /api/upload/:publicId/info
// @access  Private
router.get('/:publicId/info', protect, asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  try {
    // Get image info from Cloudinary
    const result = await cloudinary.api.resource(publicId);

    res.json({
      success: true,
      data: {
        image: {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
          width: result.width,
          height: result.height,
          createdAt: result.created_at
        }
      }
    });
  } catch (error) {
    if (error.http_code === 404) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    console.error('Error getting image info:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting image info'
    });
  }
}));

// @desc    Transform image
// @route   POST /api/upload/:publicId/transform
// @access  Private
router.post('/:publicId/transform', protect, [
  // Validation middleware would go here for transform parameters
], asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  const { width, height, crop, quality, format } = req.body;

  try {
    // Generate transformed image URL
    const transformedUrl = cloudinary.url(publicId, {
      width: width || 800,
      height: height || 600,
      crop: crop || 'limit',
      quality: quality || 'auto',
      format: format || 'auto'
    });

    res.json({
      success: true,
      data: {
        transformedUrl,
        originalPublicId: publicId,
        transformations: {
          width: width || 800,
          height: height || 600,
          crop: crop || 'limit',
          quality: quality || 'auto',
          format: format || 'auto'
        }
      }
    });
  } catch (error) {
    console.error('Error transforming image:', error);
    res.status(500).json({
      success: false,
      message: 'Error transforming image'
    });
  }
}));

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name.'
      });
    }
  }

  if (error.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router;
