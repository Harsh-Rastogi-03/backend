
const axios = require('axios');

const API_URL = 'http://localhost:8000/api/auth';

async function testAuth() {
    try {
        // 1. Register
        console.log('Testing Registration...');
        const registerRes = await axios.post(`${API_URL}/register`, {
            email: 'test' + Date.now() + '@example.com',
            password: 'password123',
            name: 'Test User',
            role: 'CUSTOMER'
        });
        console.log('Registration Success:', registerRes.status === 201);

        // 2. Login
        console.log('Testing Login...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: registerRes.config.data ? JSON.parse(registerRes.config.data).email : 'none',
            password: 'password123'
        });
        console.log('Login Success:', loginRes.status === 200 && !!loginRes.data.token);

    } catch (error) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testAuth();
