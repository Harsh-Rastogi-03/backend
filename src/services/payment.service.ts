import supabase from '../utils/supabase';
import { PaymentStatus, OrderStatus } from '../types/database.types';

// Placeholder for future Payment Gateway integration (Stripe, Razorpay, etc.)
export const processPayment = async (orderId: string, amount: number) => {
    console.log(`[PaymentService] Processing payment for Order ${orderId} Amount: ${amount}`);

    // SIMULATION: Simulate network delay and always return success
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In a real implementation:
    // 1. Create intent with Gateway
    // 2. Confirm transaction
    // 3. Handle webhook for async updates

    const success = true;

    if (success) {
        // Update Order Status
        const { error } = await supabase
            .from('orders')
            .update({
                payment_status: PaymentStatus.PAID,
                status: OrderStatus.PROCESSING, // Move to processing after payment
            })
            .eq('id', orderId);

        if (error) {
            throw new Error(`Failed to update order payment status: ${error.message}`);
        }

        return { success: true, transactionId: `MOCK_TRX_${Date.now()}` };
    } else {
        throw new Error('Payment Failed');
    }
};
