
const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function testOrders() {
    try {
        console.log('--- Starting Order Module Test ---');

        // 1. Setup: Create Admin and Customer
        const adminEmail = `admin_ord_${Date.now()}@test.com`;
        const userEmail = `user_ord_${Date.now()}@test.com`;

        // Admin Register
        const adminReg = await axios.post(`${API_URL}/auth/register`, {
            email: adminEmail, password: 'password123', name: 'Admin One', role: 'ADMIN'
        });
        const adminToken = adminReg.data.token;
        console.log('✅ Admin Registered');

        // Customer Register
        const userReg = await axios.post(`${API_URL}/auth/register`, {
            email: userEmail, password: 'password123', name: 'Customer One', role: 'CUSTOMER'
        });
        const userToken = userReg.data.token;
        console.log('✅ Customer Registered');

        // 2. Admin creates a Product
        const sku = `PROD-${Date.now()}`;
        const productRes = await axios.post(`${API_URL}/products`, {
            name: 'Diamond Ring', description: 'Shiny ring', price: 1000, stock: 10, category: 'Rings', sku
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const product = productRes.data;
        console.log('✅ Product Created. Stock:', product.stock);

        // 3. Customer places an Order
        console.log('\nPlease Order...');
        const orderRes = await axios.post(`${API_URL}/orders`, {
            items: [{ productId: product.id, quantity: 2 }],
            shippingAddress: '123 Main St', shippingCity: 'New York', shippingZip: '10001', shippingCountry: 'USA'
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        const order = orderRes.data;
        console.log('✅ Order Placed. ID:', order.id, 'Total:', order.total);

        // 4. Verify Stock Reduction
        const updatedProductRes = await axios.get(`${API_URL}/products/${product.slug}`);
        const updatedProduct = updatedProductRes.data;
        console.log(`✅ Stock Balance Verified: ${updatedProduct.stock} (Expected 8)`);
        if (updatedProduct.stock !== 8) throw new Error('Stock not reduced correctly');

        // 5. Customer checks My Orders
        const myOrdersRes = await axios.get(`${API_URL}/orders/my-orders`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('✅ My Orders Verified. Count:', myOrdersRes.data.length);

        // 6. Admin updates status
        const updateRes = await axios.patch(`${API_URL}/orders/${order.id}/status`, {
            status: 'SHIPPED',
            paymentStatus: 'PAID'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('✅ Order Status Updated:', updateRes.data.status, updateRes.data.paymentStatus);

        console.log('\n--- Order Module Verified Successfully ---');

    } catch (error) {
        console.error('\n❌ TEST FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testOrders();
