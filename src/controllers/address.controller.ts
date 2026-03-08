import { Request, Response } from 'express';
import * as addressService from '../services/address.service';
import { z } from 'zod';

interface AuthRequest extends Request {
    user?: any;
}

const createAddressSchema = z.object({
    label: z.string().optional(),
    name: z.string().min(1),
    phone: z.string().min(10),
    address: z.string().min(5),
    city: z.string().min(2),
    state: z.string().min(2),
    zipCode: z.string().min(3),
    country: z.string().optional(),
    isDefault: z.boolean().optional(),
});

const updateAddressSchema = createAddressSchema.partial();

export const getAddresses = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const addresses = await addressService.getUserAddresses(req.user.userId);
        res.status(200).json(addresses);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
};

export const getAddress = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const address = await addressService.getAddressById(req.params.id, req.user.userId);
        res.status(200).json(address);
    } catch (error: any) {
        if (error.message === 'Address not found') {
            res.status(404).json({ error: 'Address not found' });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch address' });
    }
};

export const createAddress = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const validation = createAddressSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        const address = await addressService.createAddress({
            userId: req.user.userId,
            ...validation.data,
        });

        res.status(201).json(address);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create address' });
    }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const validation = updateAddressSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        const address = await addressService.updateAddress(req.params.id, req.user.userId, validation.data);
        res.status(200).json(address);
    } catch (error: any) {
        if (error.message === 'Address not found') {
            res.status(404).json({ error: 'Address not found' });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to update address' });
    }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        await addressService.deleteAddress(req.params.id, req.user.userId);
        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete address' });
    }
};
