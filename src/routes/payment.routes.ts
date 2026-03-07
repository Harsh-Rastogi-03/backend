import { Router, Request, Response } from 'express';
import * as paymentGatewayService from '../services/payment-gateway.service';
import { authenticate } from '../middlewares/auth.middleware';
import { PaymentMethod } from '../types/database.types';

const router = Router();

// Create Razorpay order
router.post('/create-order', authenticate, async (req: Request, res: Response) => {
    try {
        const { orderId, amount, paymentMethod } = req.body;

        if (!orderId || !amount || !paymentMethod) {
            res.status(400).json({ error: 'Order ID, amount, and payment method are required' });
            return;
        }

        if (!paymentGatewayService.validatePaymentMethod(paymentMethod)) {
            res.status(400).json({ error: 'Invalid payment method' });
            return;
        }

        const order = await paymentGatewayService.createRazorpayOrder(
            orderId,
            amount,
            paymentMethod as PaymentMethod
        );

        res.json(order);
    } catch (error: any) {
        const msg = error?.error?.description || error?.message || JSON.stringify(error);
        console.error('[Payment] Create order error:', msg, error);
        res.status(500).json({ error: msg });
    }
});

// Verify Razorpay payment after checkout
router.post('/verify', authenticate, async (req: Request, res: Response) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            res.status(400).json({ error: 'Missing Razorpay payment details' });
            return;
        }

        const result = await paymentGatewayService.verifyPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        res.json(result);
    } catch (error: any) {
        const msg = error?.error?.description || error?.message || JSON.stringify(error);
        console.error('[Payment] Verify error:', msg, error);
        res.status(500).json({ error: msg });
    }
});

// Razorpay webhook (no auth — Razorpay calls this)
// Note: req.body is a raw Buffer here (see app.ts express.raw middleware)
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string;

        if (!signature) {
            res.status(400).json({ error: 'Missing webhook signature' });
            return;
        }

        const rawBody = (req.body as Buffer).toString('utf-8');
        const parsedBody = JSON.parse(rawBody);

        await paymentGatewayService.handleWebhook(rawBody, parsedBody, signature);
        res.json({ status: 'ok' });
    } catch (error: any) {
        console.error('[Payment] Webhook error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Get payment status
router.get('/:orderId/status', authenticate, async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const status = await paymentGatewayService.getPaymentStatus(orderId);

        if (!status) {
            res.status(404).json({ error: 'Payment not found' });
            return;
        }

        res.json(status);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get available payment methods
router.get('/methods', async (req: Request, res: Response) => {
    try {
        const methods = paymentGatewayService.getAllPaymentMethods();
        res.json(methods);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
