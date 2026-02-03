import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateUniqueFilename, getDateFolder } from '../utils/imageProcessor';

// Base upload directory in frontend public folder
const baseUploadDir = path.join(__dirname, '../../../frontend/public/uploads');

// Ensure base directory exists
if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
}

// Configure storage - save to a temporary folder first
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(baseUploadDir, '.temp');

        // Create directory if it doesn't exist
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        // Generate unique, sanitized filename
        const uniqueFilename = generateUniqueFilename(file.originalname);
        cb(null, uniqueFilename);
    }
});

// File filter - accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
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
        fileSize: 10 * 1024 * 1024, // 10MB limit (increased for high-quality images)
        files: 10, // Maximum 10 files per upload
    }
});

// Helper function to delete file and its variants
export const deleteFile = (filename: string) => {
    const filePath = path.join(baseUploadDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

// Export base upload directory for use in other modules
export const getUploadDir = () => baseUploadDir;
