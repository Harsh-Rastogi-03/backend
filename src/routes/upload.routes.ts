import { Router } from 'express';
import { upload } from '../config/multer';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { Request, Response } from 'express';
import { processImage } from '../utils/imageProcessor';

const router = Router();

// Upload single image with processing
router.post('/single', authenticate, authorize(['ADMIN']), upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const filename = req.file.originalname;
        const buffer = req.file.buffer;
        const contentType = req.file.mimetype;

        // Process image and upload to Supabase Storage
        const urls = await processImage(buffer, filename, contentType);

        res.status(200).json({
            message: 'Image uploaded and processed successfully',
            url: urls.original,
            thumbnail: urls.thumbnail,
            medium: urls.medium,
            filename: filename,
            variants: urls
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload and process image' });
    }
});

// Upload multiple images with processing
router.post('/multiple', authenticate, authorize(['ADMIN']), upload.array('images', 10), async (req: Request, res: Response) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            res.status(400).json({ error: 'No files uploaded' });
            return;
        }

        const results = [];

        for (const file of req.files) {
            try {
                const urls = await processImage(file.buffer, file.originalname, file.mimetype);
                results.push({
                    url: urls.original,
                    thumbnail: urls.thumbnail,
                    medium: urls.medium,
                    filename: file.originalname,
                });
            } catch (error) {
                console.error(`Error processing ${file.originalname}:`, error);
            }
        }

        const imageUrls = results.map(r => r.url);
        const thumbnailUrls = results.map(r => r.thumbnail);
        const mediumUrls = results.map(r => r.medium);

        res.status(200).json({
            message: `${results.length} image(s) uploaded and processed successfully`,
            urls: imageUrls,
            thumbnails: thumbnailUrls,
            mediums: mediumUrls,
            details: results
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload and process images' });
    }
});

export default router;
