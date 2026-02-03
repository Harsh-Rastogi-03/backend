const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function fullSystemTest() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     🧪 FULL SYSTEM TEST - SUPABASE BACKEND     ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    function logResult(test, status, details) {
        const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
        console.log(`${icon} ${test}`);
        if (details) console.log(`   ${details}`);

        if (status === 'pass') results.passed.push({ test, details });
        else if (status === 'fail') results.failed.push({ test, details });
        else results.warnings.push({ test, details });
    }

    let adminToken, userToken, productId, orderId;
    const adminEmail = `admin${Date.now()}@test.com`;
    const userEmail = `user${Date.now()}@test.com`;

    try {
        // ========== AUTHENTICATION TESTS ==========
        console.log('\n🔐 AUTHENTICATION TESTS\n' + '─'.repeat(50));

        // Test 1: Admin Registration
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                email: adminEmail,
                password: 'admin123',
                name: 'Test Admin',
                role: 'ADMIN'
            });
            adminToken = res.data.accessToken;
            logResult('Admin Registration', 'pass', `Email: ${adminEmail}`);
        } catch (e) {
            logResult('Admin Registration', 'fail', e.response?.data?.error || e.message);
        }

        // Test 2: User Registration
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                email: userEmail,
                password: 'user123',
                name: 'Test User'
            });
            userToken = res.data.accessToken;
            logResult('User Registration', 'pass', `Email: ${userEmail}`);
        } catch (e) {
            logResult('User Registration', 'fail', e.response?.data?.error || e.message);
        }

        // Test 3: User Login
        try {
            const res = await axios.post(`${API_URL}/auth/login`, {
                email: userEmail,
                password: 'user123'
            });
            logResult('User Login', 'pass', 'Tokens received');
        } catch (e) {
            logResult('User Login', 'fail', e.response?.data?.error || e.message);
        }

        // Test 4: Get Profile
        if (userToken) {
            try {
                const res = await axios.get(`${API_URL}/users/profile`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                logResult('Get User Profile', 'pass', `Name: ${res.data.name}`);
            } catch (e) {
                logResult('Get User Profile', 'fail', e.response?.data?.error || e.message);
            }
        }

        // ========== PRODUCT TESTS ==========
        console.log('\n📦 PRODUCT TESTS\n' + '─'.repeat(50));

        // Test 5: Create Product (Admin)
        if (adminToken) {
            try {
                const res = await axios.post(
                    `${API_URL}/products`,
                    {
                        name: 'Test Product',
                        description: 'A test product',
                        price: 99.99,
                        stock: 10,
                        sku: `TEST-${Date.now()}`,
                        category: 'Test',
                        tags: ['test'],
                        images: []
                    },
                    { headers: { Authorization: `Bearer ${adminToken}` } }
                );
                productId = res.data.id;
                logResult('Create Product (Admin)', 'pass', `Product ID: ${productId.substring(0, 8)}...`);
            } catch (e) {
                logResult('Create Product (Admin)', 'fail', e.response?.data?.error || e.message);
            }
        }

        // Test 6: Get All Products
        try {
            const res = await axios.get(`${API_URL}/products`);
            logResult('Get All Products', 'pass', `Found ${res.data.data.length} products`);
        } catch (e) {
            logResult('Get All Products', 'fail', e.response?.data?.error || e.message);
        }

        // Test 7: Get Product by Slug
        if (productId) {
            try {
                const res = await axios.get(`${API_URL}/products`);
                if (res.data.data.length > 0) {
                    const slug = res.data.data[0].slug;
                    const productRes = await axios.get(`${API_URL}/products/${slug}`);
                    logResult('Get Product by Slug', 'pass', `Slug: ${slug}`);
                } else {
                    logResult('Get Product by Slug', 'warn', 'No products to test');
                }
            } catch (e) {
                logResult('Get Product by Slug', 'fail', e.response?.data?.error || e.message);
            }
        }

        // Test 8: Update Product (Admin)
        if (adminToken && productId) {
            try {
                const res = await axios.put(
                    `${API_URL}/products/${productId}`,
                    { price: 149.99 },
                    { headers: { Authorization: `Bearer ${adminToken}` } }
                );
                logResult('Update Product (Admin)', 'pass', `New price: $${res.data.price}`);
            } catch (e) {
                logResult('Update Product (Admin)', 'fail', e.response?.data?.error || e.message);
            }
        }

        // ========== ORDER TESTS ==========
        console.log('\n🛒 ORDER TESTS\n' + '─'.repeat(50));

        // Test 9: Create Order
        if (userToken && productId) {
            try {
                const res = await axios.post(
                    `${API_URL}/orders`,
                    {
                        items: [{ productId, quantity: 2 }],
                        shippingAddress: '123 Test St',
                        shippingCity: 'Test City',
                        shippingZip: '12345',
                        shippingCountry: 'Test Country'
                    },
                    { headers: { Authorization: `Bearer ${userToken}` } }
                );
                orderId = res.data.id;
                logResult('Create Order', 'pass', `Order ID: ${orderId.substring(0, 8)}...`);
            } catch (e) {
                logResult('Create Order', 'fail', e.response?.data?.error || e.message);
            }
        }

        // Test 10: Get User Orders
        if (userToken) {
            try {
                const res = await axios.get(`${API_URL}/orders/my-orders`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                logResult('Get User Orders', 'pass', `Found ${res.data.length} orders`);
            } catch (e) {
                logResult('Get User Orders', 'fail', e.response?.data?.error || e.message);
            }
        }

        // Test 11: Get All Orders (Admin)
        if (adminToken) {
            try {
                const res = await axios.get(`${API_URL}/orders/admin/all`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                logResult('Get All Orders (Admin)', 'pass', `Found ${res.data.length} orders`);
            } catch (e) {
                logResult('Get All Orders (Admin)', 'fail', e.response?.data?.error || e.message);
            }
        }

        // ========== ADMIN TESTS ==========
        console.log('\n👑 ADMIN TESTS\n' + '─'.repeat(50));

        // Test 12: Get Dashboard Stats
        if (adminToken) {
            try {
                const res = await axios.get(`${API_URL}/admin/dashboard`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                logResult('Get Dashboard Stats', 'pass',
                    `Orders: ${res.data.totalOrders}, Products: ${res.data.totalProducts}`);
            } catch (e) {
                logResult('Get Dashboard Stats', 'fail', e.response?.data?.error || e.message);
            }
        }

        // Test 13: Get All Users (Admin)
        if (adminToken) {
            try {
                const res = await axios.get(`${API_URL}/admin/users`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                logResult('Get All Users (Admin)', 'pass', `Found ${res.data.length} users`);
            } catch (e) {
                logResult('Get All Users (Admin)', 'fail', e.response?.data?.error || e.message);
            }
        }

        // ========== PAYMENT TESTS ==========
        console.log('\n💳 PAYMENT TESTS\n' + '─'.repeat(50));

        // Test 14: Process Payment
        if (orderId) {
            try {
                const res = await axios.post(`${API_URL}/payments/process`, {
                    orderId: orderId
                });
                logResult('Process Payment', 'pass', `Transaction: ${res.data.transactionId}`);
            } catch (e) {
                logResult('Process Payment', 'fail', e.response?.data?.error || e.message);
            }
        }

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
    }

    // ========== SUMMARY ==========
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║                  TEST SUMMARY                    ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const total = results.passed.length + results.failed.length + results.warnings.length;
    const passRate = ((results.passed.length / total) * 100).toFixed(1);

    console.log(`  ✅ Passed:   ${results.passed.length}/${total}`);
    console.log(`  ❌ Failed:   ${results.failed.length}/${total}`);
    console.log(`  ⚠️  Warnings: ${results.warnings.length}/${total}`);
    console.log(`  📊 Success Rate: ${passRate}%\n`);

    if (results.failed.length > 0) {
        console.log('  ❌ Failed Tests:');
        results.failed.forEach(f => console.log(`     - ${f.test}: ${f.details}`));
        console.log('');
    }

    if (results.failed.length === 0) {
        console.log('  🎉 ALL TESTS PASSED!');
        console.log('  ✨ Supabase backend is fully functional!\n');
    } else if (results.passed.length > results.failed.length) {
        console.log('  ⚠️  Most tests passed!');
        console.log('  📝 Review failed tests and fix issues.\n');
    }

    console.log('  📝 Test Credentials:');
    console.log(`     Admin: ${adminEmail} / admin123`);
    console.log(`     User:  ${userEmail} / user123\n`);

    process.exit(results.failed.length === 0 ? 0 : 1);
}

fullSystemTest().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
