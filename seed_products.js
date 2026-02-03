const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

const sampleProducts = [
    {
        name: 'Premium Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life',
        price: 299.99,
        stock: 50,
        sku: 'WH-001',
        category: 'Electronics',
        tags: ['audio', 'wireless', 'premium'],
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500']
    },
    {
        name: 'Smart Watch Pro',
        description: 'Advanced smartwatch with health tracking, GPS, and 7-day battery',
        price: 399.99,
        stock: 30,
        sku: 'SW-002',
        category: 'Electronics',
        tags: ['wearable', 'fitness', 'smart'],
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500']
    },
    {
        name: 'Laptop Stand Aluminum',
        description: 'Ergonomic aluminum laptop stand with adjustable height',
        price: 49.99,
        stock: 100,
        sku: 'LS-003',
        category: 'Accessories',
        tags: ['office', 'ergonomic', 'aluminum'],
        images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500']
    },
    {
        name: 'Mechanical Keyboard RGB',
        description: 'Gaming mechanical keyboard with RGB backlighting and blue switches',
        price: 129.99,
        stock: 75,
        sku: 'KB-004',
        category: 'Electronics',
        tags: ['gaming', 'keyboard', 'rgb'],
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500']
    },
    {
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        price: 39.99,
        stock: 150,
        sku: 'MS-005',
        category: 'Electronics',
        tags: ['mouse', 'wireless', 'ergonomic'],
        images: ['https://images.unsplash.com/photo-1527814050087-3793815479db?w=500']
    },
    {
        name: 'USB-C Hub 7-in-1',
        description: 'Multi-port USB-C hub with HDMI, USB 3.0, SD card reader',
        price: 59.99,
        stock: 80,
        sku: 'HUB-006',
        category: 'Accessories',
        tags: ['usb-c', 'hub', 'connectivity'],
        images: ['https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500']
    },
    {
        name: 'Portable SSD 1TB',
        description: 'Ultra-fast portable SSD with 1TB storage and USB-C',
        price: 149.99,
        stock: 60,
        sku: 'SSD-007',
        category: 'Storage',
        tags: ['storage', 'ssd', 'portable'],
        images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500']
    },
    {
        name: 'Webcam 4K',
        description: '4K webcam with auto-focus and built-in microphone',
        price: 89.99,
        stock: 45,
        sku: 'WC-008',
        category: 'Electronics',
        tags: ['webcam', '4k', 'video'],
        images: ['https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500']
    },
    {
        name: 'Phone Stand Adjustable',
        description: 'Adjustable phone stand for desk with anti-slip base',
        price: 19.99,
        stock: 200,
        sku: 'PS-009',
        category: 'Accessories',
        tags: ['phone', 'stand', 'desk'],
        images: ['https://images.unsplash.com/photo-1556656793-08538906a9f8?w=500']
    },
    {
        name: 'Bluetooth Speaker',
        description: 'Portable Bluetooth speaker with 360° sound and waterproof design',
        price: 79.99,
        stock: 90,
        sku: 'BS-010',
        category: 'Electronics',
        tags: ['audio', 'bluetooth', 'portable'],
        images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500']
    }
];

async function seedProducts() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         🌱 SEEDING PRODUCTS TO DATABASE         ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    try {
        // Step 1: Create admin user
        console.log('1️⃣  Creating admin user...');
        const adminEmail = `admin${Date.now()}@bellariti.com`;
        const adminPassword = 'admin123456';

        const adminRes = await axios.post(`${API_URL}/auth/register`, {
            email: adminEmail,
            password: adminPassword,
            name: 'Admin User',
            role: 'ADMIN'
        });

        const adminToken = adminRes.data.accessToken;
        console.log('   ✅ Admin created:', adminEmail);
        console.log('   🔑 Token received\n');

        // Step 2: Seed products
        console.log('2️⃣  Seeding products...\n');
        const createdProducts = [];

        for (let i = 0; i < sampleProducts.length; i++) {
            const product = sampleProducts[i];
            try {
                const res = await axios.post(
                    `${API_URL}/products`,
                    product,
                    { headers: { Authorization: `Bearer ${adminToken}` } }
                );

                createdProducts.push(res.data);
                console.log(`   ✅ [${i + 1}/${sampleProducts.length}] ${product.name}`);
                console.log(`      SKU: ${product.sku} | Price: $${product.price} | Stock: ${product.stock}`);
            } catch (error) {
                console.log(`   ❌ [${i + 1}/${sampleProducts.length}] ${product.name}`);
                console.log(`      Error: ${error.response?.data?.error || error.message}`);
            }
        }

        // Step 3: Verify products
        console.log('\n3️⃣  Verifying products in database...');
        const verifyRes = await axios.get(`${API_URL}/products`);
        const totalProducts = verifyRes.data.data.length;

        console.log(`   ✅ Total products in database: ${totalProducts}`);
        console.log(`   📦 Successfully seeded: ${createdProducts.length}/${sampleProducts.length}`);

        // Summary
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║                    SUMMARY                       ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log(`  ✅ Admin User: ${adminEmail}`);
        console.log(`  📦 Products Created: ${createdProducts.length}`);
        console.log(`  💾 Total in Database: ${totalProducts}`);
        console.log('');

        if (createdProducts.length === sampleProducts.length) {
            console.log('  🎉 All products seeded successfully!');
        } else {
            console.log('  ⚠️  Some products failed to seed. Check errors above.');
        }

        console.log('\n  📝 Admin Credentials (save these!):');
        console.log(`     Email: ${adminEmail}`);
        console.log(`     Password: ${adminPassword}`);
        console.log('');

        return {
            adminEmail,
            adminPassword,
            adminToken,
            products: createdProducts
        };

    } catch (error) {
        console.error('\n❌ Seeding failed!');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('   Error:', error.message);
        }
        process.exit(1);
    }
}

// Run seeding
seedProducts()
    .then(result => {
        console.log('✨ Seeding complete!\n');
        process.exit(0);
    })
    .catch(err => {
        console.error('Fatal error:', err.message);
        process.exit(1);
    });
