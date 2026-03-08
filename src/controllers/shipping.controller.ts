import { Request, Response } from 'express';
import * as shiprocketService from '../services/shiprocket.service';
import * as orderService from '../services/order.service';
import { OrderStatus } from '../types/database.types';
import supabase from '../utils/supabase';
import { z } from 'zod';

interface AuthRequest extends Request {
    user?: any;
}

const checkServiceabilitySchema = z.object({
    pickupPincode: z.string().regex(/^\d{6}$/, 'Must be 6 digits'),
    deliveryPincode: z.string().regex(/^\d{6}$/, 'Must be 6 digits'),
    weight: z.coerce.number().positive(),
    cod: z.coerce.boolean().optional(),
});

const createOrderSchema = z.object({
    orderId: z.string().uuid(),
    billingName: z.string().min(1),
    billingAddress: z.string().min(5),
    billingCity: z.string().min(2),
    billingPincode: z.string().regex(/^\d{6}$/),
    billingState: z.string().min(2),
    billingCountry: z.string().default('India'),
    billingEmail: z.string().email(),
    billingPhone: z.string().min(10),
    shippingIsBilling: z.boolean().default(true),
    shippingName: z.string().optional(),
    shippingAddress: z.string().optional(),
    shippingCity: z.string().optional(),
    shippingPincode: z.string().optional(),
    shippingState: z.string().optional(),
    shippingCountry: z.string().optional(),
    paymentMethod: z.enum(['Prepaid', 'COD']),
    weight: z.number().positive(),
    length: z.number().positive(),
    breadth: z.number().positive(),
    height: z.number().positive(),
    courierId: z.number().optional(),
});

// Check pincode serviceability
export const checkServiceability = async (req: Request, res: Response) => {
    try {
        const validation = checkServiceabilitySchema.safeParse(req.query);
        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        const { pickupPincode, deliveryPincode, weight, cod } = validation.data;
        const result = await shiprocketService.checkServiceability(pickupPincode, deliveryPincode, weight, cod);
        res.status(200).json(result);
    } catch (error: any) {
        console.error('Serviceability check failed:', error.message);
        res.status(500).json({ error: 'Failed to check serviceability' });
    }
};

// Create Shiprocket order + assign AWB + request pickup (Admin)
export const createShipment = async (req: Request, res: Response) => {
    try {
        const validation = createOrderSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        // Fetch the order with items to build Shiprocket payload
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                items:order_items(
                    *,
                    product:products(name, sku, price)
                )
            `)
            .eq('id', validation.data.orderId)
            .single();

        if (orderError || !order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        // 1. Create order on Shiprocket
        const shiprocketOrder = await shiprocketService.createOrder({
            orderId: order.id,
            orderDate: order.created_at,
            pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
            billingName: validation.data.billingName,
            billingAddress: validation.data.billingAddress,
            billingCity: validation.data.billingCity,
            billingPincode: validation.data.billingPincode,
            billingState: validation.data.billingState,
            billingCountry: validation.data.billingCountry,
            billingEmail: validation.data.billingEmail,
            billingPhone: validation.data.billingPhone,
            shippingIsBilling: validation.data.shippingIsBilling,
            shippingName: validation.data.shippingName,
            shippingAddress: validation.data.shippingAddress,
            shippingCity: validation.data.shippingCity,
            shippingPincode: validation.data.shippingPincode,
            shippingState: validation.data.shippingState,
            shippingCountry: validation.data.shippingCountry,
            items: order.items.map((item: any) => ({
                name: item.product.name,
                sku: item.product.sku,
                units: item.quantity,
                sellingPrice: Number(item.price),
            })),
            paymentMethod: validation.data.paymentMethod,
            subTotal: Number(order.total),
            weight: validation.data.weight,
            length: validation.data.length,
            breadth: validation.data.breadth,
            height: validation.data.height,
        });

        // 2. Assign AWB (courier)
        const awbResult = await shiprocketService.assignAWB(
            shiprocketOrder.shipmentId,
            validation.data.courierId
        );

        // 3. Request pickup
        const pickupResult = await shiprocketService.requestPickup(shiprocketOrder.shipmentId);

        // 4. Update order in our DB
        await supabase
            .from('orders')
            .update({
                tracking_number: awbResult.awbCode,
                shipping_method: `Shiprocket - ${awbResult.courierName}`,
                status: OrderStatus.PROCESSING,
            })
            .eq('id', order.id);

        res.status(201).json({
            shiprocketOrderId: shiprocketOrder.orderId,
            shipmentId: shiprocketOrder.shipmentId,
            awb: awbResult.awbCode,
            courierName: awbResult.courierName,
            pickupScheduled: pickupResult.success,
            pickupDate: pickupResult.pickupScheduledDate,
        });
    } catch (error: any) {
        console.error('Create shipment failed:', error.message);
        res.status(500).json({ error: error.message || 'Failed to create shipment' });
    }
};

// Track by AWB (Admin)
export const trackShipment = async (req: Request, res: Response) => {
    try {
        const { awb } = req.params;
        if (!awb) {
            res.status(400).json({ error: 'AWB number is required' });
            return;
        }

        const tracking = await shiprocketService.trackByAWB(awb);
        res.status(200).json(tracking);
    } catch (error: any) {
        console.error('Track shipment failed:', error.message);
        res.status(500).json({ error: error.message || 'Failed to track shipment' });
    }
};

// Track order shipment (User - their own orders)
export const trackOrderShipment = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { orderId } = req.params;
        const order = await orderService.getOrderById(orderId, req.user.userId);

        if (!order.tracking_number) {
            res.status(404).json({ error: 'No tracking information available for this order' });
            return;
        }

        const tracking = await shiprocketService.trackByAWB(order.tracking_number);
        res.status(200).json(tracking);
    } catch (error: any) {
        if (error.message === 'Order not found') {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        console.error('Track order shipment failed:', error.message);
        res.status(500).json({ error: 'Failed to track shipment' });
    }
};

// Cancel shipment (Admin)
export const cancelShipment = async (req: Request, res: Response) => {
    try {
        const { shiprocketOrderId } = req.params;
        const id = parseInt(shiprocketOrderId, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Valid Shiprocket order ID is required' });
            return;
        }

        const result = await shiprocketService.cancelOrder([id]);

        res.status(200).json(result);
    } catch (error: any) {
        console.error('Cancel shipment failed:', error.message);
        res.status(500).json({ error: error.message || 'Failed to cancel shipment' });
    }
};

// Shiprocket webhook for status updates
export const shiprocketWebhook = async (req: Request, res: Response) => {
    try {
        // Verify webhook secret if configured
        const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
        if (webhookSecret) {
            const receivedSecret = req.headers['x-api-key'] || req.query.secret;
            if (receivedSecret !== webhookSecret) {
                res.status(401).json({ error: 'Unauthorized webhook request' });
                return;
            }
        }

        const payload = req.body;
        const awb = payload?.awb;
        const currentStatus = payload?.current_status;
        const orderId = payload?.order_id;

        if (!awb && !orderId) {
            res.status(400).json({ error: 'Invalid webhook payload' });
            return;
        }

        // Find order by tracking number (AWB)
        let query = supabase.from('orders').select('id, status');
        if (awb) {
            query = query.eq('tracking_number', awb);
        }
        const { data: order } = await query.single();

        if (!order) {
            console.warn(`Webhook: No order found for AWB ${awb}`);
            res.status(200).json({ received: true });
            return;
        }

        // Map Shiprocket statuses to our OrderStatus
        // See: https://apidocs.shiprocket.in/#b2dca498-a089-43d5-8f0c-5da5ce1e1226
        const statusMap: Record<string, OrderStatus> = {
            'PICKED UP': OrderStatus.SHIPPED,
            'IN TRANSIT': OrderStatus.SHIPPED,
            'OUT FOR DELIVERY': OrderStatus.SHIPPED,
            'SHIPPED': OrderStatus.SHIPPED,
            'DELIVERED': OrderStatus.DELIVERED,
            'CANCELED': OrderStatus.CANCELLED,
            'RTO INITIATED': OrderStatus.CANCELLED,
            'RTO DELIVERED': OrderStatus.CANCELLED,
        };

        const normalizedStatus = currentStatus?.toUpperCase();
        const mappedStatus = statusMap[normalizedStatus];

        if (mappedStatus && mappedStatus !== order.status) {
            const updateData: any = { status: mappedStatus };
            if (mappedStatus === OrderStatus.DELIVERED) {
                updateData.delivered_at = new Date().toISOString();
            }
            if (mappedStatus === OrderStatus.SHIPPED && order.status !== OrderStatus.SHIPPED) {
                updateData.shipped_at = new Date().toISOString();
            }
            if (mappedStatus === OrderStatus.CANCELLED) {
                updateData.cancelled_at = new Date().toISOString();
            }

            await supabase.from('orders').update(updateData).eq('id', order.id);
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Shiprocket webhook error:', error.message);
        res.status(200).json({ received: true });
    }
};
