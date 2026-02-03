import { Router, Request, Response } from 'express';
import * as paymentController from '../controllers/payment.controller';
import * as paymentGatewayService from '../services/payment-gateway.service';
import { authenticate } from '../middlewares/auth.middleware';
import { PaymentMethod } from '../types/database.types';

const router = Router();

// Legacy endpoint (keep for backward compatibility)
router.post('/process', authenticate, paymentController.processPayment);

// Create payment intent
router.post('/create-intent', authenticate, async (req: Request, res: Response) => {
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

        const intent = await paymentGatewayService.createPaymentIntent(
            orderId,
            amount,
            paymentMethod as PaymentMethod
        );

        res.json(intent);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Confirm payment
router.post('/confirm', authenticate, async (req: Request, res: Response) => {
    try {
        const { transactionId, paymentMethod } = req.body;

        if (!transactionId || !paymentMethod) {
            res.status(400).json({ error: 'Transaction ID and payment method are required' });
            return;
        }

        const confirmation = await paymentGatewayService.confirmPayment(
            transactionId,
            paymentMethod as PaymentMethod
        );

        res.json(confirmation);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
