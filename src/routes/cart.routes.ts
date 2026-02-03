import { Router, Request, Response } from 'express';
import * as cartService from '../services/cart.service';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const cart = await cartService.getCart(userId);
        res.json(cart);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get cart total (must come before /:id route)
router.get('/total', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const total = await cartService.getCartTotal(userId);
        res.json({ total });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get cart count (must come before /:id route)
router.get('/count', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const count = await cartService.getCartCount(userId);
        res.json({ count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Add item to cart
router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { productId, quantity, variantId } = req.body;

        if (!productId) {
            res.status(400).json({ error: 'Product ID is required' });
            return;
        }

        const cartItem = await cartService.addToCart(
            userId,
            productId,
            quantity || 1,
            variantId
        );

        res.status(201).json(cartItem);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update cart item quantity
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity <= 0) {
            res.status(400).json({ error: 'Valid quantity is required' });
            return;
        }

        const cartItem = await cartService.updateCartItemQuantity(id, quantity);
        res.json(cartItem);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Remove item from cart
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await cartService.removeFromCart(id);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Clear cart
router.delete('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        await cartService.clearCart(userId);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
