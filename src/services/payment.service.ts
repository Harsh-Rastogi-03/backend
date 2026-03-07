import supabase from '../utils/supabase';
import { PaymentStatus, OrderStatus } from '../types/database.types';

// This service is now superseded by payment-gateway.service.ts (Razorpay).
// Kept for backward compatibility with the legacy /payments/process endpoint.

export const processPayment = async (orderId: string, amount: number) => {
    console.log(`[PaymentService] Legacy processPayment called for Order ${orderId} Amount: ${amount}`);
    console.warn('[PaymentService] Use Razorpay flow (/payments/create-order + /payments/verify) instead.');

    const { error } = await supabase
        .from('orders')
        .update({
            payment_status: PaymentStatus.PAID,
            status: OrderStatus.PROCESSING,
        })
        .eq('id', orderId);

    if (error) {
        throw new Error(`Failed to update order payment status: ${error.message}`);
    }

    return { success: true, transactionId: `LEGACY_TRX_${Date.now()}` };
};
