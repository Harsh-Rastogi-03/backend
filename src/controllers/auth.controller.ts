import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { z } from 'zod';

export const register = async (req: Request, res: Response) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        if (error.message === 'User already exists') {
            res.status(409).json({ error: error.message });
            return;
        }
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const result = await authService.login(req.body);
        res.status(200).json(result);
    } catch (error: any) {
        if (error.message === 'Invalid credentials') {
            res.status(401).json({ error: error.message });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: 'Refresh Token required' });
            return;
        }
        const result = await authService.refreshToken(refreshToken);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(401).json({ error: error.message || 'Invalid refresh token' });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await authService.logout(refreshToken);
        }
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Logout failed' });
    }
};
