import { Router } from 'express';
import productRoutes from './product.routes';
import authRoutes from './auth.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import adminRoutes from './admin.routes';
import userRoutes from './user.routes';
import uploadRoutes from './upload.routes';
import cartRoutes from './cart.routes';
import reviewRoutes from './review.routes';
import wishlistRoutes from './wishlist.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/cart', cartRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
