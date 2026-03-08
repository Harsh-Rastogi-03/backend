import axios, { AxiosInstance } from 'axios';

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL || '';
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD || '';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

const client: AxiosInstance = axios.create({
    baseURL: SHIPROCKET_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Shiprocket uses email/password based token auth
const getAuthToken = async (): Promise<string> => {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

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

    const payload: any = {
        order_id: input.orderId,
        order_date: formattedDate,
        channel_id: '',
        pickup_location: input.pickupLocation || process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
        billing_customer_name: input.billingName,
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
        payload.shipping_customer_name = input.shippingName;
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
