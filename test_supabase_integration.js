const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function comprehensiveTest() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   🧪 SUPABASE MIGRATION VERIFICATION TEST 🧪    ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const results = [];

    try {
        const email = `test${Date.now()}@example.com`;
        const adminEmail = `admin${Date.now()}@example.com`;
        let accessToken, adminToken, productId;

        // Test 1: User Registration
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                email, password: 'password123', name: 'Test User'
            });
            accessToken = res.data.accessToken;
            results.push({ test: 'User Registration', status: '✅ PASS', details: `User ID: ${res.data.user.id.substring(0, 8)}...` });
        } catch (e) {
            results.push({ test: 'User Registration', status: '❌ FAIL', details: e.response?.data?.error || e.message });
        }

        // Test 2: User Login
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password: 'password123' });
            results.push({ test: 'User Login', status: '✅ PASS', details: 'Tokens received' });
        } catch (e) {
            results.push({ test: 'User Login', status: '❌ FAIL', details: e.response?.data?.error || e.message });
        }

        // Test 3: Get User Profile
        if (accessToken) {
            try {
                const res = await axios.get(`${API_URL}/user/profile`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                results.push({ test: 'Get User Profile', status: '✅ PASS', details: `Email: ${res.data.email}` });
            } catch (e) {
                results.push({ test: 'Get User Profile', status: '❌ FAIL', details: e.response?.data?.error || e.message });
            }
        }

        // Test 4: Admin Registration
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                email: adminEmail, password: 'admin123', name: 'Admin User', role: 'ADMIN'
            });
            adminToken = res.data.accessToken;
            results.push({ test: 'Admin Registration', status: '✅ PASS', details: `Admin ID: ${res.data.user.id.substring(0, 8)}...` });
        } catch (e) {
            results.push({ test: 'Admin Registration', status: '❌ FAIL', details: e.response?.data?.error || e.message });
        }

        // Test 5: Create Product (Admin)
        if (adminToken) {
            try {
                const res = await axios.post(`${API_URL}/admin/products`, {
                    name: 'Test Product',
                    description: 'Test product for Supabase',
                    price: 99.99,
                    stock: 50,
                    sku: `SKU-${Date.now()}`,
                    category: 'Electronics',
                    tags: ['test'],
                    images: []
                }, { headers: { Authorization: `Bearer ${adminToken}` } });
                productId = res.data.id;
                results.push({ test: 'Create Product (Admin)', status: '✅ PASS', details: `Product ID: ${productId.substring(0, 8)}...` });
            } catch (e) {
                results.push({ test: 'Create Product (Admin)', status: '❌ FAIL', details: e.response?.data?.error || e.message });
            }
        }

        // Test 6: Get Products (Public)
        try {
            const res = await axios.get(`${API_URL}/products`);
            results.push({ test: 'Get Products (Public)', status: '✅ PASS', details: `Found ${res.data.data.length} products` });
        } catch (e) {
            results.push({ test: 'Get Products (Public)', status: '❌ FAIL', details: e.response?.data?.error || e.message });
        }

        // Test 7: Create Order
        if (accessToken && productId) {
            try {
                const res = await axios.post(`${API_URL}/orders`, {
                    items: [{ productId, quantity: 2 }],
                    shippingAddress: '123 Test St',
                    shippingCity: 'Test City',
                    shippingZip: '12345',
                    shippingCountry: 'Test Country'
                }, { headers: { Authorization: `Bearer ${accessToken}` } });
                results.push({ test: 'Create Order', status: '✅ PASS', details: `Order ID: ${res.data.id.substring(0, 8)}...` });
            } catch (e) {
                results.push({ test: 'Create Order', status: '❌ FAIL', details: e.response?.data?.error || e.message });
            }
        }

        // Test 8: Get User Orders
        if (accessToken) {
            try {
                const res = await axios.get(`${API_URL}/orders/my-orders`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                results.push({ test: 'Get User Orders', status: '✅ PASS', details: `Found ${res.data.length} orders` });
            } catch (e) {
                results.push({ test: 'Get User Orders', status: '❌ FAIL', details: e.response?.data?.error || e.message });
            }
        }

    } catch (error) {
        console.error('Unexpected error:', error.message);
    }

    // Print Results
    console.log('┌──────────────────────────────────────────────────┐');
    console.log('│                  TEST RESULTS                    │');
    console.log('└──────────────────────────────────────────────────┘\n');

    results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.test}`);
        console.log(`   ${r.status}`);
        console.log(`   ${r.details}\n`);
    });

    const passed = results.filter(r => r.status.includes('PASS')).length;
    const failed = results.filter(r => r.status.includes('FAIL')).length;
    const total = results.length;

    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║                    SUMMARY                       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`  ✅ Passed: ${passed}/${total}`);
    console.log(`  ❌ Failed: ${failed}/${total}`);
    console.log(`  📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('');

    if (failed === 0) {
        console.log('  🎉 ALL TESTS PASSED!');
        console.log('  ✨ Supabase migration is successful!');
    } else if (passed > failed) {
        console.log('  ⚠️  Most tests passed, but some failed.');
        console.log('  📝 Review failed tests above.');
    } else {
        console.log('  ❌ Multiple tests failed.');
        console.log('  🔍 Check Supabase configuration and schema.');
    }
    console.log('');

    process.exit(failed === 0 ? 0 : 1);
}

comprehensiveTest().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
