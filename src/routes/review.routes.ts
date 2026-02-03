import { Router, Request, Response } from 'express';
import * as reviewService from '../services/review.service';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Get reviews for a product (public)
router.get('/product/:productId', async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = parseInt(req.query.offset as string) || 0;

        const reviews = await reviewService.getProductReviews(productId, limit, offset);
        res.json(reviews);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get review stats for a product (public)
router.get('/product/:productId/stats', async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const stats = await reviewService.getReviewStats(productId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's reviews (authenticated)
router.get('/my-reviews', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const reviews = await reviewService.getUserReviews(userId);
        res.json(reviews);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create a review (authenticated)
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { productId, rating, comment, title } = req.body;

        if (!productId || !rating || !comment) {
            res.status(400).json({ error: 'Product ID, rating, and comment are required' });
            return;
        }

        const review = await reviewService.createReview(
            productId,
            userId,
            rating,
            comment,
            title
        );

        res.status(201).json(review);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update a review (authenticated)
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const { rating, title, comment } = req.body;

        const review = await reviewService.updateReview(id, userId, {
            rating,
            title,
            comment
        });

        res.json(review);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a review (authenticated)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        await reviewService.deleteReview(id, userId);
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Mark review as helpful (authenticated)
router.post('/:id/helpful', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const review = await reviewService.markReviewHelpful(id);
        res.json(review);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
