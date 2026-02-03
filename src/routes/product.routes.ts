import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { authorize, authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', productController.getProducts);

// Admin only routes (must come before dynamic :slug route)
router.get('/admin/analytics/:id', authenticate, authorize(['ADMIN']), productController.getProductAnalytics);
router.post('/', authenticate, authorize(['ADMIN']), productController.createProduct);
router.put('/:id', authenticate, authorize(['ADMIN']), productController.updateProduct);
router.delete('/:id', authenticate, authorize(['ADMIN']), productController.deleteProduct);

// Dynamic slug route (must come last to avoid conflicts)
router.get('/:slug', productController.getProductBySlug);

export default router;
