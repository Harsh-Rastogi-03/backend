import { Router, Request, Response } from 'express';
import * as wishlistService from '../services/wishlist.service';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

// Get user's wishlist
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const wishlist = await wishlistService.getWishlist(userId);
        res.json(wishlist);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Add product to wishlist
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { productId } = req.body;

        if (!productId) {
            res.status(400).json({ error: 'Product ID is required' });
            return;
        }

        const wishlistItem = await wishlistService.addToWishlist(userId, productId);
        res.status(201).json(wishlistItem);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Remove product from wishlist
router.delete('/:productId', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { productId } = req.params;

        await wishlistService.removeFromWishlist(userId, productId);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Check if product is in wishlist
router.get('/check/:productId', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { productId } = req.params;

        const isInWishlist = await wishlistService.isInWishlist(userId, productId);
        res.json({ isInWishlist });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get wishlist count
router.get('/count', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const count = await wishlistService.getWishlistCount(userId);
        res.json({ count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Clear wishlist
router.delete('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        await wishlistService.clearWishlist(userId);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
