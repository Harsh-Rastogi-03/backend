
const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function testPaymentBypass() {
    try {
        console.log('--- Starting Payment Bypass Check ---');

        console.log('1. Registering User...');
        const userEmail = `pay_user_${Date.now()}@test.com`;
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            email: userEmail, password: 'password123', name: 'Payer', role: 'CUSTOMER'
        });
        const token = regRes.data.token;
        console.log('✅ User Registered');

        console.log('\n2. Creating Order...');
        // Create a dummy product first since DB might be empty or IDs changed
        const adminEmail = `pay_admin_${Date.now()}@test.com`;
        const adminRegRes = await axios.post(`${API_URL}/auth/register`, {
            email: adminEmail, password: 'password123', name: 'Admin', role: 'ADMIN'
        });
        const adminToken = adminRegRes.data.token;

        // Create product
        const productRes = await axios.post(`${API_URL}/products`, {
            name: 'Watch', description: 'A very nice time tracking device', price: 500, stock: 5, category: 'Watches', sku: `WATCH-${Date.now()}`
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const productId = productRes.data.id;
        console.log('✅ Product Created ID:', productId);

        // Place Order
        console.log('Placing Order with Product ID:', productId);
        const orderRes = await axios.post(`${API_URL}/orders`, {
            items: [{ productId: productId, quantity: 1 }],
            shippingAddress: '123 Wall St', shippingCity: 'New York', shippingZip: '10005', shippingCountry: 'USA'
        }, { headers: { Authorization: `Bearer ${token}` } });
        const order = orderRes.data;
        console.log(`✅ Order Created (ID: ${order.id}). Status: ${order.status}, Payment: ${order.paymentStatus}`);

        if (order.paymentStatus === 'PAID') throw new Error('Order should be PENDING initially');

        console.log('\n3. Processing Payment Bypass...');
        const payRes = await axios.post(`${API_URL}/payments/process`, {
            orderId: order.id
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log('✅ Payment Response:', payRes.data);
        if (!payRes.data.success) throw new Error('Payment reported failure');

        console.log('\n4. Verifying Order Status...');
        // Fetch user orders to check status
        const myOrdersRes = await axios.get(`${API_URL}/orders/my-orders`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const updatedOrder = myOrdersRes.data.find(o => o.id === order.id);
        console.log(`✅ Final Status: ${updatedOrder.status}, Payment: ${updatedOrder.paymentStatus}`);

        if (updatedOrder.paymentStatus !== 'PAID') throw new Error('Order Payment Status not updated to PAID');
        if (updatedOrder.status !== 'PROCESSING') throw new Error('Order Status not updated to PROCESSING');

        console.log('\n--- Payment Bypass Verified Successfully ---');

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

testPaymentBypass();
