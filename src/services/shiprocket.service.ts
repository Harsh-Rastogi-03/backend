import axios, { AxiosInstance } from 'axios';
import supabase from '../utils/supabase';

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL || '';
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD || '';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
let tokenRefreshPromise: Promise<string> | null = null;

const client: AxiosInstance = axios.create({
    baseURL: SHIPROCKET_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Shiprocket uses email/password based token auth
const getAuthToken = async (): Promise<string> => {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    // Prevent concurrent token refresh requests
    if (tokenRefreshPromise) {
        return tokenRefreshPromise;
    }

    tokenRefreshPromise = (async () => {
        try {
            const { data } = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
                email: SHIPROCKET_EMAIL,
                password: SHIPROCKET_PASSWORD,
            });

            if (!data?.token) {
                throw new Error('Failed to authenticate with Shiprocket');
            }

            cachedToken = data.token;
            // Shiprocket tokens are valid for 10 days; refresh after 9 days
            tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
            return cachedToken!;
        } finally {
            tokenRefreshPromise = null;
        }
    })();

    return tokenRefreshPromise;
};

const authHeaders = async () => ({
    Authorization: `Bearer ${await getAuthToken()}`,
});

// --- Pincode Serviceability ---

export interface ServiceabilityResult {
    serviceable: boolean;
    availableCouriers: {
        courierId: number;
        courierName: string;
        rate: number;
        etd: string; // estimated delivery days
        cod: boolean;
    }[];
}

export const checkServiceability = async (
    pickupPincode: string,
    deliveryPincode: string,
    weight: number,
    cod: boolean = false
): Promise<ServiceabilityResult> => {
    const { data } = await client.get('/courier/serviceability/', {
        headers: await authHeaders(),
        params: {
            pickup_postcode: pickupPincode,
            delivery_postcode: deliveryPincode,
            weight,
            cod: cod ? 1 : 0,
        },
    });

    const couriers = data?.data?.available_courier_companies || [];

    return {
        serviceable: couriers.length > 0,
        availableCouriers: couriers.map((c: any) => ({
            courierId: c.courier_company_id,
            courierName: c.courier_name,
            rate: c.rate,
            etd: c.etd,
            cod: c.cod === 1,
        })),
    };
};

// --- Create Order ---

export interface CreateOrderInput {
    orderId: string;
    orderDate: string; // ISO date
    pickupLocation: string; // pickup location nickname from Shiprocket
    billingName: string;
    billingAddress: string;
    billingCity: string;
    billingPincode: string;
    billingState: string;
    billingCountry: string;
    billingEmail: string;
    billingPhone: string;
    shippingIsBilling: boolean;
    shippingName?: string;
    shippingAddress?: string;
    shippingCity?: string;
    shippingPincode?: string;
    shippingState?: string;
    shippingCountry?: string;
    items: {
        name: string;
        sku: string;
        units: number;
        sellingPrice: number;
    }[];
    paymentMethod: 'Prepaid' | 'COD';
    subTotal: number;
    weight: number; // in kg
    length: number; // in cm
    breadth: number; // in cm
    height: number; // in cm
}

export interface CreateOrderResult {
    success: boolean;
    orderId: number; // Shiprocket order ID
    shipmentId: number;
    channelOrderId: string; // your order ID
}

export const createOrder = async (input: CreateOrderInput): Promise<CreateOrderResult> => {
    // Shiprocket expects date in "YYYY-MM-DD HH:mm" format
    const orderDate = new Date(input.orderDate);
    const formattedDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')} ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;

    // Shiprocket requires separate first/last name fields
    const [billingFirst, ...billingLastParts] = input.billingName.trim().split(/\s+/);
    const billingLast = billingLastParts.join(' ') || billingFirst;

    const payload: any = {
        order_id: input.orderId,
        order_date: formattedDate,
        channel_id: '',
        pickup_location: input.pickupLocation || process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
        billing_customer_name: billingFirst,
        billing_last_name: billingLast,
        billing_address: input.billingAddress,
        billing_city: input.billingCity,
        billing_pincode: input.billingPincode,
        billing_state: input.billingState,
        billing_country: input.billingCountry,
        billing_email: input.billingEmail,
        billing_phone: input.billingPhone,
        shipping_is_billing: input.shippingIsBilling ? 1 : 0,
        order_items: input.items.map((item) => ({
            name: item.name,
            sku: item.sku,
            units: item.units,
            selling_price: item.sellingPrice,
        })),
        payment_method: input.paymentMethod,
        sub_total: input.subTotal,
        weight: input.weight,
        length: input.length,
        breadth: input.breadth,
        height: input.height,
    };

    if (!input.shippingIsBilling) {
        const [shippingFirst, ...shippingLastParts] = (input.shippingName || '').trim().split(/\s+/);
        const shippingLast = shippingLastParts.join(' ') || shippingFirst;
        payload.shipping_customer_name = shippingFirst;
        payload.shipping_last_name = shippingLast;
        payload.shipping_address = input.shippingAddress;
        payload.shipping_city = input.shippingCity;
        payload.shipping_pincode = input.shippingPincode;
        payload.shipping_state = input.shippingState;
        payload.shipping_country = input.shippingCountry;
    }

    const { data } = await client.post('/orders/create/adhoc', payload, {
        headers: await authHeaders(),
    });

    if (!data?.order_id) {
        throw new Error(`Shiprocket order creation failed: ${data?.message || 'Unknown error'}`);
    }

    return {
        success: true,
        orderId: data.order_id,
        shipmentId: data.shipment_id,
        channelOrderId: input.orderId,
    };
};

// --- Assign AWB (Courier) ---

export interface AssignAWBResult {
    awbCode: string;
    courierName: string;
    courierId: number;
}

export const assignAWB = async (shipmentId: number, courierId?: number): Promise<AssignAWBResult> => {
    const payload: any = { shipment_id: shipmentId };
    if (courierId) {
        payload.courier_id = courierId;
    }

    const { data } = await client.post('/courier/assign/awb', payload, {
        headers: await authHeaders(),
    });

    const awbData = data?.response?.data;
    if (!awbData?.awb_code) {
        throw new Error(`AWB assignment failed: ${data?.message || 'Unknown error'}`);
    }

    return {
        awbCode: awbData.awb_code,
        courierName: awbData.courier_name || '',
        courierId: awbData.courier_company_id,
    };
};

// --- Request Pickup ---

export const requestPickup = async (shipmentId: number): Promise<{ success: boolean; pickupScheduledDate?: string }> => {
    const { data } = await client.post('/courier/generate/pickup', {
        shipment_id: [shipmentId],
    }, {
        headers: await authHeaders(),
    });

    return {
        success: !!data?.pickup_status,
        pickupScheduledDate: data?.response?.pickup_scheduled_date,
    };
};

// --- Track Shipment ---

export interface TrackingEvent {
    status: string;
    activity: string;
    location: string;
    date: string;
}

export interface TrackingResult {
    awb: string;
    currentStatus: string;
    courierName: string;
    etd?: string;
    events: TrackingEvent[];
}

export const trackByAWB = async (awb: string): Promise<TrackingResult> => {
    const { data } = await client.get(`/courier/track/awb/${awb}`, {
        headers: await authHeaders(),
    });

    const tracking = data?.tracking_data;
    if (!tracking) {
        throw new Error(`No tracking data found for AWB: ${awb}`);
    }

    const activities = tracking.shipment_track_activities || [];

    return {
        awb,
        currentStatus: tracking.shipment_status?.toString() || 'Unknown',
        courierName: tracking.courier_name || '',
        etd: tracking.etd,
        events: activities.map((a: any) => ({
            status: a['sr-status-label'] || a.status || '',
            activity: a.activity || '',
            location: a.location || '',
            date: a.date || '',
        })),
    };
};

export const trackByShipmentId = async (shipmentId: number): Promise<TrackingResult> => {
    const { data } = await client.get(`/courier/track/shipment/${shipmentId}`, {
        headers: await authHeaders(),
    });

    const tracking = data?.tracking_data;
    if (!tracking) {
        throw new Error(`No tracking data found for shipment: ${shipmentId}`);
    }

    const activities = tracking.shipment_track_activities || [];

    return {
        awb: tracking.awb || '',
        currentStatus: tracking.shipment_status?.toString() || 'Unknown',
        courierName: tracking.courier_name || '',
        etd: tracking.etd,
        events: activities.map((a: any) => ({
            status: a['sr-status-label'] || a.status || '',
            activity: a.activity || '',
            location: a.location || '',
            date: a.date || '',
        })),
    };
};

// --- Cancel Order ---

export const cancelOrder = async (shiprocketOrderIds: number[]): Promise<{ success: boolean; message: string }> => {
    const { data } = await client.post('/orders/cancel', {
        ids: shiprocketOrderIds,
    }, {
        headers: await authHeaders(),
    });

    return {
        success: data?.status === 200 || !!data,
        message: data?.message || 'Cancellation requested',
    };
};

// --- Auto-create shipment after payment ---

// Default dimensions for jewellery items (small, lightweight)
const DEFAULT_WEIGHT = 0.2; // kg
const DEFAULT_LENGTH = 12;  // cm
const DEFAULT_BREADTH = 10; // cm
const DEFAULT_HEIGHT = 5;   // cm

export const autoCreateShipment = async (orderId: string): Promise<{
    success: boolean;
    awb?: string;
    courierName?: string;
    error?: string;
}> => {
    try {
        // Fetch order with items, product details, and user info
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                user:users(name, email, phone),
                items:order_items(
                    *,
                    product:products(name, sku, price, weight)
                )
            `)
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return { success: false, error: 'Order not found' };
        }

        // Skip if already shipped
        if (order.tracking_number) {
            return { success: true, awb: order.tracking_number };
        }

        const userName = order.user?.name || 'Customer';
        const userEmail = order.user?.email || '';
        const userPhone = order.shipping_phone || order.user?.phone || '';

        // Calculate total weight from products or use default
        const totalWeight = order.items.reduce((sum: number, item: any) => {
            const productWeight = item.product?.weight || DEFAULT_WEIGHT;
            return sum + productWeight * item.quantity;
        }, 0) || DEFAULT_WEIGHT;

        // 1. Create order on Shiprocket
        const shiprocketOrder = await createOrder({
            orderId: order.id,
            orderDate: order.created_at,
            pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || 'Home',
            billingName: userName,
            billingAddress: order.shipping_address,
            billingCity: order.shipping_city,
            billingPincode: order.shipping_zip,
            billingState: order.shipping_state || order.shipping_city,
            billingCountry: order.shipping_country || 'India',
            billingEmail: userEmail,
            billingPhone: userPhone,
            shippingIsBilling: true,
            items: order.items.map((item: any) => ({
                name: item.product.name,
                sku: item.product.sku,
                units: item.quantity,
                sellingPrice: Number(item.price),
            })),
            paymentMethod: 'Prepaid',
            subTotal: Number(order.total),
            weight: totalWeight,
            length: DEFAULT_LENGTH,
            breadth: DEFAULT_BREADTH,
            height: DEFAULT_HEIGHT,
        });

        // 2. Assign AWB (auto-select cheapest courier)
        const awbResult = await assignAWB(shiprocketOrder.shipmentId);

        // 3. Request pickup
        await requestPickup(shiprocketOrder.shipmentId);

        // 4. Update order in DB with tracking info
        await supabase
            .from('orders')
            .update({
                tracking_number: awbResult.awbCode,
                shipping_method: `Shiprocket - ${awbResult.courierName}`,
            })
            .eq('id', order.id);

        console.log(`Auto-shipment created for order ${orderId}: AWB ${awbResult.awbCode}`);

        return {
            success: true,
            awb: awbResult.awbCode,
            courierName: awbResult.courierName,
        };
    } catch (err: any) {
        console.error(`Auto-shipment failed for order ${orderId}:`, err.message);
        // Don't throw — shipment failure shouldn't block the payment flow
        return { success: false, error: err.message };
    }
};
