const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary-v2');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const carImageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'auto-lens/cars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
    },
});

const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'auto-lens/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
    },
});

const uploadCarImages = multer({
    storage: carImageStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

// Extract public_id from a Cloudinary URL for deletion
// e.g. "https://res.cloudinary.com/xxx/image/upload/v123/auto-lens/cars/abc123.jpg"
// → "auto-lens/cars/abc123"
const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary')) return null;
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    // Remove version prefix (v1234567890/) and file extension
    const afterUpload = parts[1].replace(/^v\d+\//, '');
    return afterUpload.replace(/\.[^/.]+$/, '');
};

module.exports = {
    cloudinary,
    uploadCarImages,
    uploadAvatar,
    getPublicIdFromUrl,
};
