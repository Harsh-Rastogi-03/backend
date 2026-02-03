import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// User Routes
router.post('/', authenticate, orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getMyOrders);

// Admin Routes
router.get('/admin/all', authenticate, authorize(['ADMIN']), orderController.getAllOrders);
router.patch('/:orderId/status', authenticate, authorize(['ADMIN']), orderController.updateOrderStatus);

export default router;
