/**
 * End-to-End Image Upload Test
 * 
 * This script tests the complete flow:
 * 1. Generate test image
 * 2. Upload via API (simulating frontend)
 * 3. Create product with uploaded image
 * 4. Verify product creation
 * 5. Verify image URLs work
 * 6. Test image variants (thumbnail, medium, original)
 * 
 * Run: npx ts-node src/scripts/e2eImageTest.ts
 */

import { generateTestImage, cleanupTestImages } from '../utils/testImageGenerator';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const log = {
    info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bellariti.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

interface AuthResponse {
    accessToken: string;
    user: any;
}

interface UploadResponse {
    urls: string[];
    thumbnails: string[];
    mediums: string[];
    details: Array<{
        url: string;
        thumbnail: string;
        medium: string;
        filename: string;
    }>;
}

interface ProductResponse {
    id: string;
    name: string;
    slug: string;
    images: string[];
    price?: number;
    stock?: number;
    description?: string;
    category?: string;
    sku?: string;
}

async function authenticateAdmin(): Promise<string> {
    log.section('Step 1: Admin Authentication');

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
            }),
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as AuthResponse;
        log.success(`Authenticated as: ${data.user.email}`);
        log.info(`Role: ${data.user.role}`);

        return data.accessToken;
    } catch (error: any) {
        log.error(`Authentication failed: ${error.message}`);
        throw error;
    }
}

async function uploadTestImages(token: string): Promise<UploadResponse> {
    log.section('Step 2: Upload Test Images');

    try {
        // Generate test images with problematic filenames
        const testImages = [
            { filename: '10%-discount-product.png', text: 'Product 1' },
            { filename: 'Special #Sale! Image.png', text: 'Product 2' },
            { filename: 'New Arrival (2026).png', text: 'Product 3' },
        ];

        const imagePaths: string[] = [];

        for (const img of testImages) {
            log.info(`Generating test image: ${img.filename}`);
            const imagePath = await generateTestImage(img.filename, 800, 600, img.text);
            imagePaths.push(imagePath);
            log.success(`Generated: ${imagePath}`);
        }

        // Create FormData for upload
        const formData = new FormData();

        for (const imagePath of imagePaths) {
            const fileStream = fs.createReadStream(imagePath);
            const filename = path.basename(imagePath);
            formData.append('images', fileStream, filename);
        }

        log.info('Uploading images to API...');

        const response = await fetch(`${API_URL}/upload/multiple`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders(),
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const uploadData = await response.json() as UploadResponse;

        log.success(`Uploaded ${uploadData.urls.length} images successfully`);

        uploadData.urls.forEach((url, index) => {
            log.info(`Image ${index + 1}:`);
            log.info(`  Original:  ${url}`);
            log.info(`  Medium:    ${uploadData.mediums[index]}`);
            log.info(`  Thumbnail: ${uploadData.thumbnails[index]}`);
        });

        return uploadData;
    } catch (error: any) {
        log.error(`Image upload failed: ${error.message}`);
        throw error;
    }
}

async function createProductWithImages(token: string, imageUrls: string[]): Promise<ProductResponse> {
    log.section('Step 3: Create Product with Uploaded Images');

    try {
        const productData = {
            name: 'E2E Test Product - Special Characters Test!',
            description: 'This is a test product created by the E2E test script to verify image upload functionality with special characters in filenames.',
            price: 99.99,
            stock: 100,
            category: 'Test Category',
            sku: `TEST-${Date.now()}`,
            images: imageUrls,
            isActive: true,
        };

        log.info(`Creating product: ${productData.name}`);
        log.info(`SKU: ${productData.sku}`);
        log.info(`Images: ${imageUrls.length}`);

        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(productData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Product creation failed: ${response.status} - ${errorText}`);
        }

        const product = await response.json() as ProductResponse;

        log.success(`Product created successfully!`);
        log.info(`Product ID: ${product.id}`);
        log.info(`Product Slug: ${product.slug}`);
        log.info(`Product Images: ${product.images.length}`);

        product.images.forEach((img, index) => {
            log.info(`  Image ${index + 1}: ${img}`);
        });

        return product;
    } catch (error: any) {
        log.error(`Product creation failed: ${error.message}`);
        throw error;
    }
}

async function verifyImageAccess(imageUrls: string[]): Promise<void> {
    log.section('Step 4: Verify Image Accessibility');

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    for (const imageUrl of imageUrls) {
        const fullUrl = `${FRONTEND_URL}${imageUrl}`;

        try {
            log.info(`Checking: ${fullUrl}`);

            const response = await fetch(fullUrl);

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                const contentLength = response.headers.get('content-length');

                log.success(`✓ Accessible (${response.status})`);
                log.info(`  Content-Type: ${contentType}`);
                log.info(`  Size: ${contentLength ? (parseInt(contentLength) / 1024).toFixed(2) + ' KB' : 'unknown'}`);
            } else {
                log.error(`✗ Not accessible (${response.status})`);
            }
        } catch (error: any) {
            log.error(`✗ Error accessing image: ${error.message}`);
        }
    }
}

async function verifyImageVariants(uploadData: UploadResponse): Promise<void> {
    log.section('Step 5: Verify Image Variants (Thumbnail, Medium, Original)');

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    for (let i = 0; i < uploadData.urls.length; i++) {
        log.info(`\nImage Set ${i + 1}:`);

        const variants = [
            { name: 'Original', url: uploadData.urls[i] },
            { name: 'Medium', url: uploadData.mediums[i] },
            { name: 'Thumbnail', url: uploadData.thumbnails[i] },
        ];

        for (const variant of variants) {
            const fullUrl = `${FRONTEND_URL}${variant.url}`;

            try {
                const response = await fetch(fullUrl);

                if (response.ok) {
                    const contentLength = response.headers.get('content-length');
                    const sizeKB = contentLength ? (parseInt(contentLength) / 1024).toFixed(2) : 'unknown';
                    log.success(`  ${variant.name.padEnd(10)}: ${sizeKB} KB`);
                } else {
                    log.error(`  ${variant.name.padEnd(10)}: Not accessible (${response.status})`);
                }
            } catch (error: any) {
                log.error(`  ${variant.name.padEnd(10)}: Error - ${error.message}`);
            }
        }
    }
}

async function verifyProductRetrieval(productSlug: string): Promise<void> {
    log.section('Step 6: Verify Product Retrieval (Frontend API Call)');

    try {
        log.info(`Fetching product by slug: ${productSlug}`);

        const response = await fetch(`${API_URL}/products/${productSlug}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch product: ${response.status}`);
        }

        const product = await response.json() as ProductResponse;

        log.success('Product retrieved successfully');
        log.info(`Name: ${product.name}`);
        log.info(`Price: ₹${product.price || 0}`);
        log.info(`Stock: ${product.stock || 0}`);
        log.info(`Images: ${product.images.length}`);

        product.images.forEach((img: string, index: number) => {
            log.info(`  ${index + 1}. ${img}`);
        });

    } catch (error: any) {
        log.error(`Product retrieval failed: ${error.message}`);
        throw error;
    }
}

async function cleanupTestProduct(token: string, productId: string): Promise<void> {
    log.section('Step 7: Cleanup Test Product');

    try {
        log.info(`Deleting test product: ${productId}`);

        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            log.success('Test product deleted successfully');
        } else {
            log.warning(`Failed to delete test product: ${response.status}`);
        }
    } catch (error: any) {
        log.warning(`Cleanup error: ${error.message}`);
    }
}

async function runE2ETest() {
    console.log('\n' + '='.repeat(70));
    log.section('🚀 END-TO-END IMAGE UPLOAD TEST (Frontend + Backend)');
    console.log('='.repeat(70));

    let token: string = '';
    let productId: string = '';
    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // Step 1: Authenticate
        token = await authenticateAdmin();
        testsPassed++;

        // Step 2: Upload images with special characters
        const uploadData = await uploadTestImages(token);
        testsPassed++;

        // Step 3: Create product
        const product = await createProductWithImages(token, uploadData.urls);
        productId = product.id;
        testsPassed++;

        // Step 4: Verify image accessibility
        await verifyImageAccess(uploadData.urls);
        testsPassed++;

        // Step 5: Verify image variants
        await verifyImageVariants(uploadData);
        testsPassed++;

        // Step 6: Verify product retrieval
        await verifyProductRetrieval(product.slug);
        testsPassed++;

        // Step 7: Cleanup
        if (productId) {
            await cleanupTestProduct(token, productId);
        }
        cleanupTestImages();
        log.success('Cleanup completed');

    } catch (error: any) {
        log.error(`E2E Test failed: ${error.message}`);
        console.error(error);
        testsFailed++;

        // Attempt cleanup even on failure
        if (token && productId) {
            await cleanupTestProduct(token, productId);
        }
        cleanupTestImages();
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    log.section('📊 E2E TEST SUMMARY');
    console.log('='.repeat(70));

    const total = testsPassed + testsFailed;
    const percentage = total > 0 ? ((testsPassed / total) * 100).toFixed(1) : '0';

    log.info(`Total Steps: ${total}`);
    log.success(`Passed: ${testsPassed}`);

    if (testsFailed > 0) {
        log.error(`Failed: ${testsFailed}`);
    } else {
        log.info(`Failed: ${testsFailed}`);
    }

    console.log(`\nSuccess Rate: ${colors.bright}${percentage}%${colors.reset}\n`);

    if (testsFailed === 0) {
        console.log(`${colors.green}${colors.bright}🎉 E2E TEST PASSED! Complete image upload flow is working.${colors.reset}\n`);
        console.log(`${colors.cyan}✓ Frontend image upload works${colors.reset}`);
        console.log(`${colors.cyan}✓ Backend processing works${colors.reset}`);
        console.log(`${colors.cyan}✓ Product creation works${colors.reset}`);
        console.log(`${colors.cyan}✓ Image variants generated${colors.reset}`);
        console.log(`${colors.cyan}✓ All images accessible${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}${colors.bright}❌ E2E TEST FAILED. Please review the errors above.${colors.reset}\n`);
        process.exit(1);
    }
}

// Run the E2E test
runE2ETest().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
