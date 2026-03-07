import 'dotenv/config'; // Loads .env locally; in production (Railway) env vars are injected directly
import app from './app';

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`Razorpay mode: ${process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live') ? 'LIVE' : 'TEST'}`);
});
