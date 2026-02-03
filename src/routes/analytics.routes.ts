import { Router, Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// All analytics routes require admin authentication
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Get dashboard statistics
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const stats = await analyticsService.getDashboardStats();
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get sales analytics by date range
router.get('/sales', async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            res.status(400).json({ error: 'Start date and end date are required' });
            return;
        }

        const analytics = await analyticsService.getSalesAnalytics(
            startDate as string,
            endDate as string
        );

        res.json(analytics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get revenue by period
router.get('/revenue', async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const revenue = await analyticsService.getRevenueByPeriod(days);
        res.json(revenue);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get top selling products
router.get('/products/top', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const topProducts = await analyticsService.getTopSellingProducts(limit);
        res.json(topProducts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get customer analytics
router.get('/customers', async (req: Request, res: Response) => {
    try {
        const customerAnalytics = await analyticsService.getCustomerAnalytics();
        res.json(customerAnalytics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update daily sales analytics (manual trigger)
router.post('/update-daily', async (req: Request, res: Response) => {
    try {
        const { date } = req.body;
        const dateStr = date || new Date().toISOString().split('T')[0];

        const analytics = await analyticsService.updateDailySalesAnalytics(dateStr);
        res.json(analytics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
