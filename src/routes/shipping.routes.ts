import { Router } from 'express';
import * as shippingController from '../controllers/shipping.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Public: Check pincode serviceability
router.get('/serviceability', shippingController.checkServiceability);

// User: Track their order's shipment
router.get('/track/order/:orderId', authenticate, shippingController.trackOrderShipment);

// Admin: Create shipment (order + AWB + pickup)
router.post('/shipment', authenticate, authorize(['ADMIN']), shippingController.createShipment);

// Admin: Track any shipment by AWB
router.get('/track/:awb', authenticate, authorize(['ADMIN']), shippingController.trackShipment);

// Admin: Cancel a shipment
router.post('/cancel/:shiprocketOrderId', authenticate, authorize(['ADMIN']), shippingController.cancelShipment);

// Webhook: Shiprocket status updates
router.post('/webhook/shiprocket', shippingController.shiprocketWebhook);

export default router;
