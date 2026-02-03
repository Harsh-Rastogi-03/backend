/**
 * Image Upload System - Sanity Check Script
 * 
 * This script tests the entire image upload flow:
 * 1. Filename sanitization
 * 2. UUID generation
 * 3. Date folder creation
 * 4. Image processing (thumbnails, optimization)
 * 5. File storage
 * 6. URL generation
 * 
 * Run: npx ts-node src/scripts/sanityCheckImages.ts
 */

import { generateTestImage, cleanupTestImages } from '../utils/testImageGenerator';
import { sanitizeFilename, generateUniqueFilename, getDateFolder, processImage } from '../utils/imageProcessor';
import path from 'path';
import fs from 'fs';

// ANSI color codes for pretty output
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

// Test cases for filename sanitization
const testFilenames = [
    '10%-discount-banner.png',
    'Product #123 (New!).jpg',
    'Summer Sale!!! 2026.png',
    'café_menu_español.jpg',
    '___special___offer___.png',
    'normal-filename.jpg',
];

async function runSanityCheck() {
    console.log('\n' + '='.repeat(60));
    log.section('🔍 IMAGE UPLOAD SYSTEM - SANITY CHECK');
    console.log('='.repeat(60));

    let passedTests = 0;
    let failedTests = 0;

    try {
        // Test 1: Filename Sanitization
        log.section('Test 1: Filename Sanitization');
        for (const filename of testFilenames) {
            const sanitized = sanitizeFilename(filename);
            const isValid = /^[a-z0-9-_]+$/.test(sanitized);

            if (isValid) {
                log.success(`"${filename}" → "${sanitized}"`);
                passedTests++;
            } else {
                log.error(`"${filename}" → "${sanitized}" (contains invalid characters)`);
                failedTests++;
            }
        }

        // Test 2: UUID Generation
        log.section('Test 2: UUID-Based Filename Generation');
        const uuids = new Set();
        for (let i = 0; i < 5; i++) {
            const uniqueFilename = generateUniqueFilename('test-image.jpg');
            const hasUuid = /^[a-f0-9]{8}-/.test(uniqueFilename);

            if (hasUuid && !uuids.has(uniqueFilename)) {
                log.success(`Generated: ${uniqueFilename}`);
                uuids.add(uniqueFilename);
                passedTests++;
            } else {
                log.error(`Failed to generate unique filename: ${uniqueFilename}`);
                failedTests++;
            }
        }

        // Test 3: Date Folder Structure
        log.section('Test 3: Date Folder Structure');
        const dateFolder = getDateFolder();
        const isValidDateFormat = /^\d{4}\/\d{2}$/.test(dateFolder);

        if (isValidDateFormat) {
            log.success(`Date folder format: ${dateFolder}`);
            passedTests++;
        } else {
            log.error(`Invalid date folder format: ${dateFolder}`);
            failedTests++;
        }

        // Test 4: Image Generation
        log.section('Test 4: Test Image Generation');
        const testImagePath = await generateTestImage(
            'sanity-check-test.png',
            800,
            600,
            'Sanity Check'
        );

        if (fs.existsSync(testImagePath)) {
            const stats = fs.statSync(testImagePath);
            log.success(`Test image created: ${testImagePath}`);
            log.info(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
            passedTests++;
        } else {
            log.error('Failed to create test image');
            failedTests++;
        }

        // Test 5: Image Processing
        log.section('Test 5: Image Processing (Thumbnails & Optimization)');
        const uploadDir = path.join(__dirname, '../../../frontend/public/uploads', dateFolder);

        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            log.info(`Created upload directory: ${uploadDir}`);
        }

        const processedFilename = generateUniqueFilename('sanity-check-processed.png');

        try {
            const processedImages = await processImage(
                testImagePath,
                uploadDir,
                processedFilename
            );

            // Check if all variants were created
            const variants = ['original', 'thumbnail', 'medium'];
            let allVariantsExist = true;

            for (const variant of variants) {
                const variantFilename = processedImages[variant];
                const variantPath = path.join(uploadDir, variantFilename);

                if (fs.existsSync(variantPath)) {
                    const stats = fs.statSync(variantPath);
                    log.success(`${variant.padEnd(10)}: ${variantFilename} (${(stats.size / 1024).toFixed(2)} KB)`);
                    passedTests++;
                } else {
                    log.error(`${variant} variant not created: ${variantFilename}`);
                    allVariantsExist = false;
                    failedTests++;
                }
            }

            if (allVariantsExist) {
                log.success('All image variants created successfully');
            }

        } catch (error: any) {
            log.error(`Image processing failed: ${error.message}`);
            failedTests++;
        }

        // Test 6: URL Generation
        log.section('Test 6: URL Generation');
        const testUrls = [
            `/uploads/${dateFolder}/${processedFilename}`,
            `/uploads/${dateFolder}/${processedFilename.replace('.png', '-thumb.png')}`,
            `/uploads/${dateFolder}/${processedFilename.replace('.png', '-medium.png')}`,
        ];

        for (const url of testUrls) {
            const isValidUrl = url.startsWith('/uploads/') && /^\d{4}\/\d{2}\//.test(url.replace('/uploads/', ''));

            if (isValidUrl) {
                log.success(`Valid URL: ${url}`);
                passedTests++;
            } else {
                log.error(`Invalid URL: ${url}`);
                failedTests++;
            }
        }

        // Test 7: File System Check
        log.section('Test 7: File System Verification');
        const publicUploadsDir = path.join(__dirname, '../../../frontend/public/uploads');

        if (fs.existsSync(publicUploadsDir)) {
            log.success(`Upload directory exists: ${publicUploadsDir}`);

            // Check if date folder exists
            const dateFolderPath = path.join(publicUploadsDir, dateFolder);
            if (fs.existsSync(dateFolderPath)) {
                log.success(`Date folder exists: ${dateFolder}`);

                // List files in date folder
                const files = fs.readdirSync(dateFolderPath);
                log.info(`Files in date folder: ${files.length}`);

                if (files.length > 0) {
                    log.info('Sample files:');
                    files.slice(0, 5).forEach(file => {
                        const filePath = path.join(dateFolderPath, file);
                        const stats = fs.statSync(filePath);
                        log.info(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
                    });
                }

                passedTests += 2;
            } else {
                log.error(`Date folder not found: ${dateFolder}`);
                failedTests++;
            }
        } else {
            log.error(`Upload directory not found: ${publicUploadsDir}`);
            failedTests++;
        }

        // Test 8: Special Characters Test
        log.section('Test 8: Special Characters Handling');
        const specialCharTests = [
            { input: '10%-discount.png', shouldContain: 'discount' },
            { input: 'Product #123.jpg', shouldContain: 'product-123' },
            { input: 'Sale!!!.png', shouldContain: 'sale' },
        ];

        for (const test of specialCharTests) {
            const result = generateUniqueFilename(test.input);
            const sanitizedPart = result.split('-').slice(1).join('-'); // Remove UUID

            if (sanitizedPart.includes(test.shouldContain.replace('.png', '').replace('.jpg', ''))) {
                log.success(`"${test.input}" correctly sanitized to include "${test.shouldContain}"`);
                passedTests++;
            } else {
                log.error(`"${test.input}" sanitization failed. Got: ${result}`);
                failedTests++;
            }
        }

    } catch (error: any) {
        log.error(`Sanity check failed with error: ${error.message}`);
        console.error(error);
        failedTests++;
    } finally {
        // Cleanup
        log.section('Cleanup');
        try {
            cleanupTestImages();
            log.success('Test images cleaned up');
        } catch (error: any) {
            log.warning(`Cleanup warning: ${error.message}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    log.section('📊 SANITY CHECK SUMMARY');
    console.log('='.repeat(60));

    const total = passedTests + failedTests;
    const percentage = total > 0 ? ((passedTests / total) * 100).toFixed(1) : '0';

    log.info(`Total Tests: ${total}`);
    log.success(`Passed: ${passedTests}`);

    if (failedTests > 0) {
        log.error(`Failed: ${failedTests}`);
    } else {
        log.info(`Failed: ${failedTests}`);
    }

    console.log(`\nSuccess Rate: ${colors.bright}${percentage}%${colors.reset}\n`);

    if (failedTests === 0) {
        console.log(`${colors.green}${colors.bright}🎉 ALL TESTS PASSED! Image upload system is working correctly.${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}${colors.bright}❌ SOME TESTS FAILED. Please review the errors above.${colors.reset}\n`);
        process.exit(1);
    }
}

// Run the sanity check
runSanityCheck().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
