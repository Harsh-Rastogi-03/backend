import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/dashboard', authenticate, authorize(['ADMIN']), adminController.getDashboardStats);
router.get('/users', authenticate, authorize(['ADMIN']), userController.getAllUsers);
router.get('/users/:id', authenticate, authorize(['ADMIN']), userController.getUserWithOrders);

export default router;
