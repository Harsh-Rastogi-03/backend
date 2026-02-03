import supabase from '../utils/supabase';
import { PaymentTransaction, PaymentMethod, TransactionStatus, PaymentStatus } from '../types/database.types';
import { v4 as uuidv4 } from 'uuid';

interface PaymentIntent {
    transactionId: string;
    amount: number;
    currency: string;
    orderId: string;
}

interface PaymentConfirmation {
    success: boolean;
    transactionId: string;
    message: string;
}

/**
 * Mock Payment Gateway Service
 * Simulates payment processing for testing purposes
 */

export const createPaymentIntent = async (
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod
): Promise<PaymentIntent> => {
    // Generate unique transaction ID
    const transactionId = `TXN_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Create payment transaction record
    const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
            order_id: orderId,
            transaction_id: transactionId,
            payment_method: paymentMethod,
            amount,
            status: 'PENDING'
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        transactionId,
        amount,
        currency: 'USD',
        orderId
    };
};

export const confirmPayment = async (
    transactionId: string,
    paymentMethod: PaymentMethod
): Promise<PaymentConfirmation> => {
    // Get transaction
    const { data: transaction, error: fetchError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

    if (fetchError || !transaction) {
        throw new Error('Transaction not found');
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock payment success (90% success rate for testing)
    const isSuccess = Math.random() > 0.1;
    const newStatus: TransactionStatus = isSuccess ? 'COMPLETED' : 'FAILED';

    // Update transaction status
    const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
            status: newStatus,
            gateway_response: {
                success: isSuccess,
                timestamp: new Date().toISOString(),
                method: paymentMethod,
                message: isSuccess ? 'Payment processed successfully' : 'Payment failed - Insufficient funds'
            }
        })
        .eq('transaction_id', transactionId);

    if (updateError) throw new Error(updateError.message);

    // Update order payment status
    if (isSuccess) {
        const { error: orderError } = await supabase
            .from('orders')
            .update({ payment_status: 'PAID' })
            .eq('id', transaction.order_id);

        if (orderError) throw new Error(orderError.message);
    }

    return {
        success: isSuccess,
        transactionId,
        message: isSuccess
            ? 'Payment completed successfully'
            : 'Payment failed. Please try again.'
    };
};

export const getPaymentStatus = async (orderId: string): Promise<PaymentTransaction | null> => {
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) return null;
    return data;
};

export const refundPayment = async (transactionId: string): Promise<boolean> => {
    // Get transaction
    const { data: transaction, error: fetchError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

    if (fetchError || !transaction) {
        throw new Error('Transaction not found');
    }

    if (transaction.status !== 'COMPLETED') {
        throw new Error('Only completed transactions can be refunded');
    }

    // Update transaction to refunded
    const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
            status: 'REFUNDED',
            gateway_response: {
                ...transaction.gateway_response,
                refunded: true,
                refund_timestamp: new Date().toISOString()
            }
        })
        .eq('transaction_id', transactionId);

    if (updateError) throw new Error(updateError.message);

    // Update order payment status
    const { error: orderError } = await supabase
        .from('orders')
        .update({ payment_status: 'REFUNDED' })
        .eq('id', transaction.order_id);

    if (orderError) throw new Error(orderError.message);

    return true;
};

export const getAllPaymentMethods = (): PaymentMethod[] => {
    return [
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.DEBIT_CARD,
        PaymentMethod.UPI,
        PaymentMethod.NET_BANKING,
        PaymentMethod.WALLET,
        PaymentMethod.COD
    ];
};

export const validatePaymentMethod = (method: string): boolean => {
    return Object.values(PaymentMethod).includes(method as PaymentMethod);
};
