import { Router } from 'express';
import { upload } from '../config/multer';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { Request, Response } from 'express';
import { processImage, getDateFolder } from '../utils/imageProcessor';
import path from 'path';
import fs from 'fs';

const router = Router();

// Upload single image with processing
router.post('/single', authenticate, authorize(['ADMIN']), upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const dateFolder = getDateFolder();
        const filename = req.file.filename;
        const tempFilePath = req.file.path;

        // Define final output directory (date-based)
        const uploadDir = path.join(__dirname, '../../../frontend/public/uploads');
        const finalOutputDir = path.join(uploadDir, dateFolder);

        // Process image (create thumbnails and optimize) from temp to final destination
        const processedImages = await processImage(tempFilePath, finalOutputDir, filename);

        // Delete temporary file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        // Construct URLs with date folder
        const imageUrl = `/uploads/${dateFolder}/${processedImages.original}`;
        const thumbnailUrl = `/uploads/${dateFolder}/${processedImages.thumbnail}`;
        const mediumUrl = `/uploads/${dateFolder}/${processedImages.medium}`;

        res.status(200).json({
            message: 'Image uploaded and processed successfully',
            url: imageUrl,
            thumbnail: thumbnailUrl,
            medium: mediumUrl,
            filename: processedImages.original,
            variants: processedImages
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

        const dateFolder = getDateFolder();
        const uploadDir = path.join(__dirname, '../../../frontend/public/uploads');
        const finalOutputDir = path.join(uploadDir, dateFolder);
        const results = [];

        // Ensure final output directory exists
        if (!fs.existsSync(finalOutputDir)) {
            fs.mkdirSync(finalOutputDir, { recursive: true });
        }

        // Process each uploaded image
        for (const file of req.files) {
            const filename = file.filename;
            const tempFilePath = file.path;

            try {
                // Process image (create thumbnails and optimize) from temp to final destination
                const processedImages = await processImage(tempFilePath, finalOutputDir, filename);

                // Delete temporary file
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }

                results.push({
                    url: `/uploads/${dateFolder}/${processedImages.original}`,
                    thumbnail: `/uploads/${dateFolder}/${processedImages.thumbnail}`,
                    medium: `/uploads/${dateFolder}/${processedImages.medium}`,
                    filename: processedImages.original,
                });
            } catch (error) {
                console.error(`Error processing ${filename}:`, error);
                // Even if processing fails, try to clean up the temp file
                if (fs.existsSync(tempFilePath)) {
                    try { fs.unlinkSync(tempFilePath); } catch (e) { }
                }
            }
        }

        // Extract just the URLs for backward compatibility
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
