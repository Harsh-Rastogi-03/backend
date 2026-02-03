import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { z } from 'zod';

const updateProfileSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
});

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const user = await userService.getUserById(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const validation = updateProfileSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        const updatedUser = await userService.updateUser(userId, validation.data);
        const { password, ...userWithoutPassword } = updatedUser;

        res.status(200).json(userWithoutPassword);
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2002') {
            res.status(409).json({ error: 'Email already in use' });
            return;
        }
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const getUserWithOrders = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserWithOrders(id);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
};
