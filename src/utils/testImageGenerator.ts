import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * Generate a test image with text overlay
 * This creates a real image file for testing
 */
export const generateTestImage = async (
    filename: string,
    width: number = 800,
    height: number = 600,
    text: string = 'Test Image'
): Promise<string> => {
    const outputPath = path.join(__dirname, '../../test-images', filename);

    // Ensure test-images directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Create a colorful gradient background
    const svg = `
        <svg width="${width}" height="${height}">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:rgb(99,102,241);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:rgb(168,85,247);stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#grad1)" />
            <text x="50%" y="50%" font-family="Arial" font-size="48" fill="white" 
                  text-anchor="middle" dominant-baseline="middle" font-weight="bold">
                ${text}
            </text>
        </svg>
    `;

    await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);

    return outputPath;
};

/**
 * Clean up test images
 */
export const cleanupTestImages = () => {
    const testDir = path.join(__dirname, '../../test-images');
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
};
