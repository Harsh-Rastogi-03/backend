const axios = require('axios');

const API_URL = 'http://localhost:8000/api';
const ADMIN_EMAIL = 'admin1769708614809@bellariti.com';
const ADMIN_PASSWORD = 'admin123456';

async function testEnhancedFeatures() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   🧪 ENHANCED FEATURES TEST - COMPLETE FLOW     ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const results = { passed: 0, failed: 0, tests: [] };

    function logTest(name, passed, details = '') {
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${name}`);
        if (details) console.log(`   ${details}`);
        results.tests.push({ name, passed, details });
        if (passed) results.passed++;
        else results.failed++;
    }

    let adminToken, userToken, userId, productId, orderId, cartItemId, reviewId, transactionId;

    try {
        // ========== SETUP ==========
        console.log('\n🔧 SETUP\n' + '─'.repeat(50));

        // Create test user
        const userEmail = `testuser${Date.now()}@example.com`;
        const userRes = await axios.post(`${API_URL}/auth/register`, {
            email: userEmail,
            password: 'test123',
            name: 'Test User'
        });
        userToken = userRes.data.accessToken;
        userId = userRes.data.user.id;
        logTest('Create Test User', true, userEmail);

        // Admin login
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        adminToken = adminRes.data.accessToken;
        logTest('Admin Login', true, ADMIN_EMAIL);

        // Create test product
        const productRes = await axios.post(`${API_URL}/products`, {
            name: `Enhanced Test Product ${Date.now()}`,
            description: 'Product with enhanced features',
            price: 99.99,
            stock: 100,
            sku: `ENH-${Date.now()}`,
            category: 'Test',
            tags: ['test', 'enhanced'],
            images: [],
            brand: 'TestBrand',
            features: ['Feature 1', 'Feature 2', 'Feature 3'],
            warranty_period: 12,
            is_featured: true
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        productId = productRes.data.id;
        logTest('Create Enhanced Product', true, `ID: ${productId.substring(0, 8)}...`);

        // ========== CART TESTS ==========
        console.log('\n🛒 CART TESTS\n' + '─'.repeat(50));

        // Add to cart
        try {
            const cartRes = await axios.post(`${API_URL}/cart`, {
                productId,
                quantity: 2
            }, { headers: { Authorization: `Bearer ${userToken}` } });
            cartItemId = cartRes.data.id;
            logTest('Add to Cart', true, `Quantity: 2`);
        } catch (e) {
            logTest('Add to Cart', false, e.response?.data?.error || e.message);
        }

        // Get cart
        try {
            const cartRes = await axios.get(`${API_URL}/cart`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            logTest('Get Cart', true, `Items: ${cartRes.data.length}`);
        } catch (e) {
            logTest('Get Cart', false, e.response?.data?.error || e.message);
        }

        // Get cart total
        try {
            const totalRes = await axios.get(`${API_URL}/cart/total`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            logTest('Get Cart Total', true, `Total: $${totalRes.data.total}`);
        } catch (e) {
            logTest('Get Cart Total', false, e.response?.data?.error || e.message);
        }

        // Update cart quantity
        if (cartItemId) {
            try {
                await axios.put(`${API_URL}/cart/${cartItemId}`, {
                    quantity: 3
                }, { headers: { Authorization: `Bearer ${userToken}` } });
                logTest('Update Cart Quantity', true, 'New quantity: 3');
            } catch (e) {
                logTest('Update Cart Quantity', false, e.response?.data?.error || e.message);
            }
        }

        // ========== WISHLIST TESTS ==========
        console.log('\n❤️  WISHLIST TESTS\n' + '─'.repeat(50));

        // Add to wishlist
        try {
            await axios.post(`${API_URL}/wishlist`, {
                productId
            }, { headers: { Authorization: `Bearer ${userToken}` } });
            logTest('Add to Wishlist', true);
        } catch (e) {
            logTest('Add to Wishlist', false, e.response?.data?.error || e.message);
        }

        // Get wishlist
        try {
            const wishlistRes = await axios.get(`${API_URL}/wishlist`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            logTest('Get Wishlist', true, `Items: ${wishlistRes.data.length}`);
        } catch (e) {
            logTest('Get Wishlist', false, e.response?.data?.error || e.message);
        }

        // Check if in wishlist
        try {
            const checkRes = await axios.get(`${API_URL}/wishlist/check/${productId}`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            logTest('Check Wishlist Status', true, `In wishlist: ${checkRes.data.isInWishlist}`);
        } catch (e) {
            logTest('Check Wishlist Status', false, e.response?.data?.error || e.message);
        }

        // ========== ORDER & PAYMENT TESTS ==========
        console.log('\n💳 ORDER & PAYMENT TESTS\n' + '─'.repeat(50));

        // Create order
        try {
            const orderRes = await axios.post(`${API_URL}/orders`, {
                items: [{ productId, quantity: 1 }],
                shippingAddress: '123 Test St',
                shippingCity: 'Test City',
                shippingZip: '12345',
                shippingCountry: 'Test Country'
            }, { headers: { Authorization: `Bearer ${userToken}` } });
            orderId = orderRes.data.id;
            logTest('Create Order', true, `Order ID: ${orderId.substring(0, 8)}...`);
        } catch (e) {
            logTest('Create Order', false, e.response?.data?.error || e.message);
        }

        // Create payment intent
        if (orderId) {
            try {
                const intentRes = await axios.post(`${API_URL}/payments/create-intent`, {
                    orderId,
                    amount: 99.99,
                    paymentMethod: 'CREDIT_CARD'
                }, { headers: { Authorization: `Bearer ${userToken}` } });
                transactionId = intentRes.data.transactionId;
                logTest('Create Payment Intent', true, `Transaction: ${transactionId}`);
            } catch (e) {
                logTest('Create Payment Intent', false, e.response?.data?.error || e.message);
            }
        }

        // Confirm payment
        if (transactionId) {
            try {
                const confirmRes = await axios.post(`${API_URL}/payments/confirm`, {
                    transactionId,
                    paymentMethod: 'CREDIT_CARD'
                }, { headers: { Authorization: `Bearer ${userToken}` } });
                logTest('Confirm Payment', confirmRes.data.success, confirmRes.data.message);
            } catch (e) {
                logTest('Confirm Payment', false, e.response?.data?.error || e.message);
            }
        }

        // Get payment status
        if (orderId) {
            try {
                const statusRes = await axios.get(`${API_URL}/payments/${orderId}/status`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                logTest('Get Payment Status', true, `Status: ${statusRes.data.status}`);
            } catch (e) {
                logTest('Get Payment Status', false, e.response?.data?.error || e.message);
            }
        }

        // ========== REVIEW TESTS ==========
        console.log('\n⭐ REVIEW TESTS\n' + '─'.repeat(50));

        // Create review
        try {
            const reviewRes = await axios.post(`${API_URL}/reviews`, {
                productId,
                rating: 5,
                title: 'Great product!',
                comment: 'This is an excellent product. Highly recommended!'
            }, { headers: { Authorization: `Bearer ${userToken}` } });
            reviewId = reviewRes.data.id;
            logTest('Create Review', true, 'Rating: 5 stars');
        } catch (e) {
            logTest('Create Review', false, e.response?.data?.error || e.message);
        }

        // Get product reviews
        try {
            const reviewsRes = await axios.get(`${API_URL}/reviews/product/${productId}`);
            logTest('Get Product Reviews', true, `Reviews: ${reviewsRes.data.length}`);
        } catch (e) {
            logTest('Get Product Reviews', false, e.response?.data?.error || e.message);
        }

        // Get review stats
        try {
            const statsRes = await axios.get(`${API_URL}/reviews/product/${productId}/stats`);
            logTest('Get Review Stats', true, `Average: ${statsRes.data.average}, Total: ${statsRes.data.total}`);
        } catch (e) {
            logTest('Get Review Stats', false, e.response?.data?.error || e.message);
        }

        // Mark review helpful
        if (reviewId) {
            try {
                await axios.post(`${API_URL}/reviews/${reviewId}/helpful`, {}, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                logTest('Mark Review Helpful', true);
            } catch (e) {
                logTest('Mark Review Helpful', false, e.response?.data?.error || e.message);
            }
        }

        // ========== ANALYTICS TESTS ==========
        console.log('\n📊 ANALYTICS TESTS\n' + '─'.repeat(50));

        // Get dashboard stats
        try {
            const dashboardRes = await axios.get(`${API_URL}/analytics/dashboard`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            logTest('Get Dashboard Stats', true,
                `Orders: ${dashboardRes.data.totals.orders}, Revenue: $${dashboardRes.data.totals.revenue}`);
        } catch (e) {
            logTest('Get Dashboard Stats', false, e.response?.data?.error || e.message);
        }

        // Get revenue data
        try {
            const revenueRes = await axios.get(`${API_URL}/analytics/revenue?days=7`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            logTest('Get Revenue Data', true, `Data points: ${revenueRes.data.length}`);
        } catch (e) {
            logTest('Get Revenue Data', false, e.response?.data?.error || e.message);
        }

        // Get top products
        try {
            const topRes = await axios.get(`${API_URL}/analytics/products/top?limit=5`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            logTest('Get Top Products', true, `Products: ${topRes.data.length}`);
        } catch (e) {
            logTest('Get Top Products', false, e.response?.data?.error || e.message);
        }

        // Get customer analytics
        try {
            const customerRes = await axios.get(`${API_URL}/analytics/customers`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            logTest('Get Customer Analytics', true,
                `Total: ${customerRes.data.total_customers}, Active: ${customerRes.data.active_customers}`);
        } catch (e) {
            logTest('Get Customer Analytics', false, e.response?.data?.error || e.message);
        }

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
    }

    // ========== SUMMARY ==========
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║                  TEST SUMMARY                    ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const total = results.passed + results.failed;
    const successRate = ((results.passed / total) * 100).toFixed(1);

    console.log(`  ✅ Passed:   ${results.passed}/${total}`);
    console.log(`  ❌ Failed:   ${results.failed}/${total}`);
    console.log(`  📊 Success Rate: ${successRate}%\n`);

    if (results.failed > 0) {
        console.log('  ❌ Failed Tests:');
        results.tests.filter(t => !t.passed).forEach(t =>
            console.log(`     - ${t.name}: ${t.details}`)
        );
        console.log('');
    }

    if (results.failed === 0) {
        console.log('  🎉 ALL TESTS PASSED!');
        console.log('  ✨ All enhanced features are working!\n');
    } else if (results.passed > results.failed) {
        console.log('  ⚠️  Most tests passed!');
        console.log('  📝 Review failed tests and fix issues.\n');
    }

    process.exit(results.failed === 0 ? 0 : 1);
}

testEnhancedFeatures().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
