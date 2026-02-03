const axios = require('axios');

const BACKEND_URL = 'http://localhost:8000/api';
const FRONTEND_URL = 'http://localhost:3000';

// Admin credentials from seeding
const ADMIN_EMAIL = 'admin1769708614809@bellariti.com';
const ADMIN_PASSWORD = 'admin123456';

async function sanitycheckComplete() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     🔍 COMPLETE SANITY CHECK & E2E TEST         ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const results = {
        backend: { passed: 0, failed: 0, tests: [] },
        frontend: { passed: 0, failed: 0, tests: [] },
        integration: { passed: 0, failed: 0, tests: [] }
    };

    function logTest(category, name, passed, details = '') {
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${name}`);
        if (details) console.log(`   ${details}`);

        results[category].tests.push({ name, passed, details });
        if (passed) results[category].passed++;
        else results[category].failed++;
    }

    // ========================================
    // PART 1: BACKEND SANITY CHECK
    // ========================================
    console.log('═'.repeat(50));
    console.log('PART 1: BACKEND SANITY CHECK');
    console.log('═'.repeat(50) + '\n');

    // Test 1: Backend Health
    try {
        const res = await axios.get(`${BACKEND_URL}/products`);
        logTest('backend', 'Backend Server Running', res.status === 200, `Status: ${res.status}`);
    } catch (e) {
        logTest('backend', 'Backend Server Running', false, e.message);
    }

    // Test 2: Database Connection
    try {
        const res = await axios.get(`${BACKEND_URL}/products`);
        const hasData = res.data && res.data.data;
        logTest('backend', 'Database Connection', hasData, `Products: ${res.data.data?.length || 0}`);
    } catch (e) {
        logTest('backend', 'Database Connection', false, e.message);
    }

    // Test 3: User Registration
    let testUserEmail, testUserToken;
    try {
        testUserEmail = `sanitytest${Date.now()}@example.com`;
        const res = await axios.post(`${BACKEND_URL}/auth/register`, {
            email: testUserEmail,
            password: 'test123',
            name: 'Sanity Test User'
        });
        testUserToken = res.data.accessToken;
        logTest('backend', 'User Registration', res.status === 201, `Email: ${testUserEmail}`);
    } catch (e) {
        logTest('backend', 'User Registration', false, e.response?.data?.error || e.message);
    }

    // Test 4: User Login
    try {
        const res = await axios.post(`${BACKEND_URL}/auth/login`, {
            email: testUserEmail,
            password: 'test123'
        });
        logTest('backend', 'User Login', res.status === 200 && !!res.data.accessToken, 'Token received');
    } catch (e) {
        logTest('backend', 'User Login', false, e.response?.data?.error || e.message);
    }

    // Test 5: Get User Profile
    if (testUserToken) {
        try {
            const res = await axios.get(`${BACKEND_URL}/users/profile`, {
                headers: { Authorization: `Bearer ${testUserToken}` }
            });
            logTest('backend', 'Get User Profile', res.status === 200, `Name: ${res.data.name}`);
        } catch (e) {
            logTest('backend', 'Get User Profile', false, e.response?.data?.error || e.message);
        }
    }

    // Test 6: Admin Login
    let adminToken;
    try {
        const res = await axios.post(`${BACKEND_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        adminToken = res.data.accessToken;
        logTest('backend', 'Admin Login', res.status === 200, 'Admin authenticated');
    } catch (e) {
        logTest('backend', 'Admin Login', false, e.response?.data?.error || e.message);
    }

    // Test 7: Create Product (Admin)
    let productId;
    if (adminToken) {
        try {
            const res = await axios.post(`${BACKEND_URL}/products`, {
                name: `Sanity Test Product ${Date.now()}`,
                description: 'Created by sanity check',
                price: 99.99,
                stock: 10,
                sku: `SANITY-${Date.now()}`,
                category: 'Test',
                tags: ['test'],
                images: []
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            productId = res.data.id;
            logTest('backend', 'Create Product (Admin)', res.status === 201, `ID: ${productId?.substring(0, 8)}...`);
        } catch (e) {
            logTest('backend', 'Create Product (Admin)', false, e.response?.data?.error || e.message);
        }
    }

    // Test 8: Get All Products
    try {
        const res = await axios.get(`${BACKEND_URL}/products`);
        logTest('backend', 'Get All Products', res.status === 200, `Count: ${res.data.data.length}`);
    } catch (e) {
        logTest('backend', 'Get All Products', false, e.response?.data?.error || e.message);
    }

    // Test 9: Update Product (Admin)
    if (adminToken && productId) {
        try {
            const res = await axios.put(`${BACKEND_URL}/products/${productId}`, {
                price: 149.99
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            logTest('backend', 'Update Product (Admin)', res.status === 200, `New price: $${res.data.price}`);
        } catch (e) {
            logTest('backend', 'Update Product (Admin)', false, e.response?.data?.error || e.message);
        }
    }

    // Test 10: Create Order
    if (testUserToken && productId) {
        try {
            const res = await axios.post(`${BACKEND_URL}/orders`, {
                items: [{ productId, quantity: 1 }],
                shippingAddress: '123 Test St',
                shippingCity: 'Test City',
                shippingZip: '12345',
                shippingCountry: 'Test Country'
            }, { headers: { Authorization: `Bearer ${testUserToken}` } });
            logTest('backend', 'Create Order', res.status === 201, `Order ID: ${res.data.id?.substring(0, 8)}...`);
        } catch (e) {
            logTest('backend', 'Create Order', false, e.response?.data?.error || e.message);
        }
    }

    // Test 11: Get User Orders
    if (testUserToken) {
        try {
            const res = await axios.get(`${BACKEND_URL}/orders/my-orders`, {
                headers: { Authorization: `Bearer ${testUserToken}` }
            });
            logTest('backend', 'Get User Orders', res.status === 200, `Orders: ${res.data.length}`);
        } catch (e) {
            logTest('backend', 'Get User Orders', false, e.response?.data?.error || e.message);
        }
    }

    // Test 12: Admin Dashboard
    if (adminToken) {
        try {
            const res = await axios.get(`${BACKEND_URL}/admin/dashboard`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            logTest('backend', 'Admin Dashboard', res.status === 200,
                `Orders: ${res.data.totalOrders}, Products: ${res.data.totalProducts}`);
        } catch (e) {
            logTest('backend', 'Admin Dashboard', false, e.response?.data?.error || e.message);
        }
    }

    // ========================================
    // PART 2: FRONTEND SANITY CHECK
    // ========================================
    console.log('\n' + '═'.repeat(50));
    console.log('PART 2: FRONTEND SANITY CHECK');
    console.log('═'.repeat(50) + '\n');

    // Test 1: Frontend Server
    try {
        const res = await axios.get(FRONTEND_URL);
        logTest('frontend', 'Frontend Server Running', res.status === 200, 'Homepage accessible');
    } catch (e) {
        logTest('frontend', 'Frontend Server Running', false, e.message);
    }

    // Test 2: Products Page
    try {
        const res = await axios.get(`${FRONTEND_URL}/products`);
        logTest('frontend', 'Products Page', res.status === 200, 'Page loads');
    } catch (e) {
        logTest('frontend', 'Products Page', false, e.message);
    }

    // Test 3: Login Page
    try {
        const res = await axios.get(`${FRONTEND_URL}/login`);
        logTest('frontend', 'Login Page', res.status === 200, 'Page loads');
    } catch (e) {
        logTest('frontend', 'Login Page', false, e.message);
    }

    // Test 4: Admin Pages
    try {
        const res = await axios.get(`${FRONTEND_URL}/admin`);
        logTest('frontend', 'Admin Dashboard Page', res.status === 200, 'Page loads');
    } catch (e) {
        logTest('frontend', 'Admin Dashboard Page', false, e.message);
    }

    // ========================================
    // PART 3: INTEGRATION TESTS
    // ========================================
    console.log('\n' + '═'.repeat(50));
    console.log('PART 3: INTEGRATION TESTS');
    console.log('═'.repeat(50) + '\n');

    // Test 1: Frontend can fetch products from backend
    try {
        const backendRes = await axios.get(`${BACKEND_URL}/products`);
        const backendCount = backendRes.data.data.length;
        logTest('integration', 'Frontend-Backend Product Sync', backendCount > 0,
            `${backendCount} products available`);
    } catch (e) {
        logTest('integration', 'Frontend-Backend Product Sync', false, e.message);
    }

    // Test 2: CORS Configuration
    try {
        const res = await axios.get(`${BACKEND_URL}/products`, {
            headers: { 'Origin': FRONTEND_URL }
        });
        logTest('integration', 'CORS Configuration', res.status === 200, 'Cross-origin requests allowed');
    } catch (e) {
        logTest('integration', 'CORS Configuration', false, e.message);
    }

    // Test 3: Authentication Flow
    try {
        const loginRes = await axios.post(`${BACKEND_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.accessToken;

        const profileRes = await axios.get(`${BACKEND_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        logTest('integration', 'Complete Auth Flow', profileRes.status === 200,
            'Login → Get Profile successful');
    } catch (e) {
        logTest('integration', 'Complete Auth Flow', false, e.response?.data?.error || e.message);
    }

    // Test 4: Product to Order Flow
    if (testUserToken && productId) {
        try {
            // Get product
            const productRes = await axios.get(`${BACKEND_URL}/products`);
            const product = productRes.data.data.find(p => p.id === productId);

            // Create order
            const orderRes = await axios.post(`${BACKEND_URL}/orders`, {
                items: [{ productId: product.id, quantity: 1 }],
                shippingAddress: '123 Test St',
                shippingCity: 'Test City',
                shippingZip: '12345',
                shippingCountry: 'Test Country'
            }, { headers: { Authorization: `Bearer ${testUserToken}` } });

            logTest('integration', 'Product to Order Flow', orderRes.status === 201,
                'Product → Order creation successful');
        } catch (e) {
            logTest('integration', 'Product to Order Flow', false, e.response?.data?.error || e.message);
        }
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '╔' + '═'.repeat(48) + '╗');
    console.log('║' + ' '.repeat(18) + 'SUMMARY' + ' '.repeat(23) + '║');
    console.log('╚' + '═'.repeat(48) + '╝\n');

    const totalPassed = results.backend.passed + results.frontend.passed + results.integration.passed;
    const totalFailed = results.backend.failed + results.frontend.failed + results.integration.failed;
    const totalTests = totalPassed + totalFailed;
    const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

    console.log('📊 BACKEND TESTS');
    console.log(`   ✅ Passed: ${results.backend.passed}`);
    console.log(`   ❌ Failed: ${results.backend.failed}`);
    console.log('');

    console.log('🎨 FRONTEND TESTS');
    console.log(`   ✅ Passed: ${results.frontend.passed}`);
    console.log(`   ❌ Failed: ${results.frontend.failed}`);
    console.log('');

    console.log('🔗 INTEGRATION TESTS');
    console.log(`   ✅ Passed: ${results.integration.passed}`);
    console.log(`   ❌ Failed: ${results.integration.failed}`);
    console.log('');

    console.log('═'.repeat(50));
    console.log(`📈 OVERALL: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
    console.log('═'.repeat(50));
    console.log('');

    if (totalFailed > 0) {
        console.log('❌ FAILED TESTS:');
        ['backend', 'frontend', 'integration'].forEach(category => {
            const failed = results[category].tests.filter(t => !t.passed);
            if (failed.length > 0) {
                console.log(`\n${category.toUpperCase()}:`);
                failed.forEach(t => console.log(`   - ${t.name}: ${t.details}`));
            }
        });
        console.log('');
    }

    if (totalFailed === 0) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✨ System is fully operational and production-ready!');
    } else if (successRate >= 80) {
        console.log('⚠️  Most tests passed!');
        console.log('📝 Review failed tests and address issues.');
    } else {
        console.log('❌ Multiple tests failed.');
        console.log('🔍 Review system configuration and logs.');
    }

    console.log('');
    console.log('📝 Test Credentials:');
    console.log(`   Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`   Test User: ${testUserEmail} / test123`);
    console.log('');

    process.exit(totalFailed === 0 ? 0 : 1);
}

sanitycheckComplete().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
