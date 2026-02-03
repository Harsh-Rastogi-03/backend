const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function quickTest() {
    console.log('🧪 Quick Supabase Test\n');

    try {
        // Test 1: Register
        console.log('1️⃣  Testing Registration...');
        const email = `test${Date.now()}@example.com`;
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            email: email,
            password: 'password123',
            name: 'Test User'
        });

        console.log('✅ Registration successful!');
        console.log('   User ID:', registerRes.data.user.id);
        console.log('   Email:', registerRes.data.user.email);
        console.log('   Has Access Token:', !!registerRes.data.accessToken);
        console.log('   Has Refresh Token:', !!registerRes.data.refreshToken);

        const accessToken = registerRes.data.accessToken;

        // Test 2: Login
        console.log('\n2️⃣  Testing Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: email,
            password: 'password123'
        });

        console.log('✅ Login successful!');
        console.log('   Has Access Token:', !!loginRes.data.accessToken);

        // Test 3: Get Profile
        console.log('\n3️⃣  Testing Get Profile...');
        const profileRes = await axios.get(`${API_URL}/user/profile`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        console.log('✅ Profile retrieved!');
        console.log('   Name:', profileRes.data.name);
        console.log('   Email:', profileRes.data.email);
        console.log('   Role:', profileRes.data.role);

        console.log('\n🎉 All basic tests passed! Supabase is working!');

    } catch (error) {
        console.error('\n❌ Test failed!');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('   Error:', error.message);
        }
    }
}

quickTest();
