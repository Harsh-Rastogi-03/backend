import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import supabase from './supabase';

const BUCKET_NAME = 'product-images';

// Image size configurations
export const IMAGE_SIZES = {
    thumbnail: { width: 150, height: 150, quality: 80 },
    small: { width: 300, height: 300, quality: 85 },
    medium: { width: 600, height: 600, quality: 90 },
    large: { width: 1200, height: 1200, quality: 95 },
};

/**
 * Sanitize filename - remove special characters and spaces
 */
export const sanitizeFilename = (filename: string): string => {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    const sanitized = nameWithoutExt
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return sanitized;
};

/**
 * Generate unique filename using UUID
 */
export const generateUniqueFilename = (originalFilename: string): string => {
    const ext = path.extname(originalFilename).toLowerCase();
    const sanitized = sanitizeFilename(originalFilename);
    const shortUuid = uuidv4().split('-')[0];
    return `${shortUuid}-${sanitized}${ext}`;
};

/**
 * Get date-based folder structure: YYYY/MM
 */
export const getDateFolder = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
};

/**
 * Upload a buffer to Supabase Storage and return the public URL
 */
const uploadToSupabase = async (
    buffer: Buffer,
    storagePath: string,
    contentType: string
): Promise<string> => {
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
            contentType,
            upsert: true,
        });

    if (error) {
        throw new Error(`Supabase upload failed for ${storagePath}: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

    return urlData.publicUrl;
};

/**
 * Determine output content type and sharp format from the input
 */
const getOutputFormat = (buffer: Buffer, originalMime?: string) => {
    // Default to jpeg for best compression; preserve png/webp if that's the input
    if (originalMime === 'image/png') return { format: 'png' as const, contentType: 'image/png' };
    if (originalMime === 'image/webp') return { format: 'webp' as const, contentType: 'image/webp' };
    return { format: 'jpeg' as const, contentType: 'image/jpeg' };
};

/**
 * Process image buffer and upload all variants to Supabase Storage.
 * Returns public URLs for each variant.
 */
export const processImage = async (
    inputBuffer: Buffer,
    filename: string,
    contentType?: string
): Promise<{ original: string; thumbnail: string; medium: string }> => {
    const dateFolder = getDateFolder();
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    const { format, contentType: outContentType } = getOutputFormat(inputBuffer, contentType);

    // Process original (optimized, max 1200px)
    const originalBuffer = await sharp(inputBuffer)
        .resize(IMAGE_SIZES.large.width, IMAGE_SIZES.large.height, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        [format]({ quality: IMAGE_SIZES.large.quality })
        .toBuffer();

    // Process thumbnail (150x150 cover crop)
    const thumbnailBuffer = await sharp(inputBuffer)
        .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, {
            fit: 'cover',
            position: 'center',
        })
        [format]({ quality: IMAGE_SIZES.thumbnail.quality })
        .toBuffer();

    // Process medium (600x600)
    const mediumBuffer = await sharp(inputBuffer)
        .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        [format]({ quality: IMAGE_SIZES.medium.quality })
        .toBuffer();

    // Upload all variants to Supabase Storage in parallel
    const [originalUrl, thumbnailUrl, mediumUrl] = await Promise.all([
        uploadToSupabase(originalBuffer, `${dateFolder}/${filename}`, outContentType),
        uploadToSupabase(thumbnailBuffer, `${dateFolder}/${nameWithoutExt}-thumb${ext}`, outContentType),
        uploadToSupabase(mediumBuffer, `${dateFolder}/${nameWithoutExt}-medium${ext}`, outContentType),
    ]);

    return {
        original: originalUrl,
        thumbnail: thumbnailUrl,
        medium: mediumUrl,
    };
};

/**
 * Delete all image variants from Supabase Storage
 */
export const deleteImageVariants = async (imageUrl: string): Promise<void> => {
    // Extract the storage path from the public URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/PRODUCT-IMAGES/<path>
    const bucketPath = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const idx = imageUrl.indexOf(bucketPath);
    if (idx === -1) return;

    const storagePath = imageUrl.substring(idx + bucketPath.length);
    const ext = path.extname(storagePath);
    const nameWithoutExt = storagePath.replace(ext, '');

    const pathsToDelete = [
        storagePath,
        `${nameWithoutExt}-thumb${ext}`,
        `${nameWithoutExt}-medium${ext}`,
    ];

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(pathsToDelete);

    if (error) {
        console.error('Failed to delete image variants from Supabase:', error.message);
    }
};
