import { Request, Response } from 'express';
import * as adminService from '../services/admin.service';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const stats = await adminService.getDashboardStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
