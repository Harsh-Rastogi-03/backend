import multer from 'multer';
import { generateUniqueFilename } from '../utils/imageProcessor';

// Use memory storage - files stay as buffers, no disk writes
const storage = multer.memoryStorage();

// File filter - accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
        // Attach a sanitized unique filename for later use
        file.originalname = generateUniqueFilename(file.originalname);
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
};

// Create multer upload instance
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10, // Maximum 10 files per upload
    }
});
