import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Image size configurations (industry standard)
export const IMAGE_SIZES = {
    thumbnail: { width: 150, height: 150, quality: 80 },
    small: { width: 300, height: 300, quality: 85 },
    medium: { width: 600, height: 600, quality: 90 },
    large: { width: 1200, height: 1200, quality: 95 },
};

/**
 * Sanitize filename - remove special characters and spaces
 * Industry standard: only alphanumeric, hyphens, and underscores
 */
export const sanitizeFilename = (filename: string): string => {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    // Remove special characters, keep only alphanumeric, hyphens, and underscores
    const sanitized = nameWithoutExt
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-') // Replace special chars with hyphen
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    return sanitized;
};

/**
 * Generate unique filename using UUID
 * Format: uuid-sanitized-original-name.ext
 */
export const generateUniqueFilename = (originalFilename: string): string => {
    const ext = path.extname(originalFilename).toLowerCase();
    const sanitized = sanitizeFilename(originalFilename);
    const uuid = uuidv4();

    // Use first 8 characters of UUID for brevity
    const shortUuid = uuid.split('-')[0];

    return `${shortUuid}-${sanitized}${ext}`;
};

/**
 * Get date-based folder structure
 * Format: YYYY/MM (e.g., 2026/01)
 */
export const getDateFolder = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
};

/**
 * Process and optimize image
 * Creates multiple sizes and optimizes for web
 */
export const processImage = async (
    inputPath: string,
    outputDir: string,
    filename: string
): Promise<{ [key: string]: string }> => {
    const results: { [key: string]: string } = {};
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process original (optimized)
    const originalPath = path.join(outputDir, filename);
    await sharp(inputPath)
        .resize(IMAGE_SIZES.large.width, IMAGE_SIZES.large.height, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .jpeg({ quality: IMAGE_SIZES.large.quality, progressive: true })
        .png({ quality: IMAGE_SIZES.large.quality, compressionLevel: 9 })
        .webp({ quality: IMAGE_SIZES.large.quality })
        .toFile(originalPath);

    results.original = filename;

    // Process thumbnail
    const thumbnailFilename = `${nameWithoutExt}-thumb${ext}`;
    const thumbnailPath = path.join(outputDir, thumbnailFilename);
    await sharp(inputPath)
        .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, {
            fit: 'cover',
            position: 'center',
        })
        .jpeg({ quality: IMAGE_SIZES.thumbnail.quality })
        .png({ quality: IMAGE_SIZES.thumbnail.quality })
        .webp({ quality: IMAGE_SIZES.thumbnail.quality })
        .toFile(thumbnailPath);

    results.thumbnail = thumbnailFilename;

    // Process medium size
    const mediumFilename = `${nameWithoutExt}-medium${ext}`;
    const mediumPath = path.join(outputDir, mediumFilename);
    await sharp(inputPath)
        .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .jpeg({ quality: IMAGE_SIZES.medium.quality })
        .png({ quality: IMAGE_SIZES.medium.quality })
        .webp({ quality: IMAGE_SIZES.medium.quality })
        .toFile(mediumPath);

    results.medium = mediumFilename;

    return results;
};

/**
 * Delete all image variants
 */
export const deleteImageVariants = (baseFilename: string, uploadDir: string): void => {
    const ext = path.extname(baseFilename);
    const nameWithoutExt = path.basename(baseFilename, ext);

    const variants = [
        baseFilename,
        `${nameWithoutExt}-thumb${ext}`,
        `${nameWithoutExt}-medium${ext}`,
    ];

    variants.forEach(variant => {
        const filePath = path.join(uploadDir, variant);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
};
