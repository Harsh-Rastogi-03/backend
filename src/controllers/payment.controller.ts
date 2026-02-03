import { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import supabase from '../utils/supabase';
import { z } from 'zod';

const paymentSchema = z.object({
    orderId: z.string(),
});

export const processPayment = async (req: Request, res: Response) => {
    try {
        const validation = paymentSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        const { orderId } = validation.data;

        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        if (order.payment_status === 'PAID') {
            res.status(400).json({ error: 'Order is already paid' });
            return;
        }

        const result = await paymentService.processPayment(order.id, Number(order.total));
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Payment processing failed' });
    }
};
