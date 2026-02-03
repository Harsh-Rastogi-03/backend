import { Request, Response } from 'express';
import * as orderService from '../services/order.service';
import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '../types/database.types';


// Define Authenticated Request type locally or import if available
interface AuthRequest extends Request {
    user?: any;
}

const createOrderSchema = z.object({
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
    })).min(1),
    shippingAddress: z.string().min(5),
    shippingCity: z.string().min(2),
    shippingZip: z.string().min(3),
    shippingCountry: z.string().min(2),
});

const updateOrderSchema = z.object({
    status: z.nativeEnum(OrderStatus),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
});

export const createOrder = async (req: AuthRequest, res: Response) => {
    try {
        const validation = createOrderSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        if (!req.user || !req.user.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const order = await orderService.createOrder({
            userId: req.user.userId,
            ...validation.data,
        });

        res.status(201).json(order);
    } catch (error: any) {
        console.error(error);
        if (error.message.includes('Insufficient stock') || error.message.includes('Product with ID')) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to create order' });
    }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const orders = await orderService.getUserOrders(req.user.userId);
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const orders = await orderService.getAllOrders();
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const validation = updateOrderSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        const order = await orderService.updateOrderStatus(
            orderId,
            validation.data.status,
            validation.data.paymentStatus
        );
        res.status(200).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update order' });
    }
};
