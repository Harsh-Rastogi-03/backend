import { Router } from 'express';
import * as addressController from '../controllers/address.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, addressController.getAddresses);
router.get('/:id', authenticate, addressController.getAddress);
router.post('/', authenticate, addressController.createAddress);
router.put('/:id', authenticate, addressController.updateAddress);
router.delete('/:id', authenticate, addressController.deleteAddress);

export default router;
