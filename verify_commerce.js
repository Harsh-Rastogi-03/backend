
const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function testCommerce() {
    try {
        console.log('--- Starting Sanity Check ---');

        // 1. Register Admin User
        const adminEmail = `admin_${Date.now()}@test.com`;
        console.log(`\n1. Registering Admin (${adminEmail})...`);
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            email: adminEmail,
            password: 'password123',
            name: 'Admin User',
            role: 'ADMIN' // Note: In a real app, role selection should be restricted
        });
        const { token } = registerRes.data;
        console.log('✅ Admin Registration Success');

        // 2. Create Product (Admin Only)
        console.log('\n2. Creating Product as Admin...');
        const productData = {
            name: 'Gold Necklace',
            description: 'A beautiful 24k gold necklace.',
            price: 1500.00,
            stock: 50,
            category: 'Necklaces',
            sku: `GN-${Date.now()}`,
            tags: ['gold', 'luxury']
        };

        const createProductRes = await axios.post(`${API_URL}/products`, productData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const product = createProductRes.data;
        console.log('✅ Product Creation Success:', product.id);

        // 3. Fetch Products (Public)
        console.log('\n3. Fetching Products (Public)...');
        const productsRes = await axios.get(`${API_URL}/products?limit=5`);
        console.log('✅ Fetch Success. Total:', productsRes.data.meta.total);
        console.log('   Data:', productsRes.data.data.map(p => p.name));

        // 4. Fetch by Slug
        console.log(`\n4. Fetching Product by Slug (${product.slug})...`);
        const slugRes = await axios.get(`${API_URL}/products/${product.slug}`);
        console.log('✅ Fetch by Slug Success:', slugRes.data.id === product.id);

        console.log('\n--- Sanity Check Complete: ALL SYSTEMS GO ---');

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

testCommerce();
