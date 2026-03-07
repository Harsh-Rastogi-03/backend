import Razorpay from 'razorpay';
import crypto from 'crypto';
import supabase from '../utils/supabase';
import { PaymentMethod, TransactionStatus, PaymentStatus } from '../types/database.types';
import { v4 as uuidv4 } from 'uuid';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

interface RazorpayOrderResult {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    orderId: string;
    keyId: string;
}

interface PaymentVerificationResult {
    success: boolean;
    transactionId: string;
    message: string;
}

/**
 * Create a Razorpay order and store a pending payment transaction
 */
export const createRazorpayOrder = async (
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod
): Promise<RazorpayOrderResult> => {
    // Amount in paise (Razorpay expects smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        notes: {
            orderId,
            paymentMethod,
        },
    });

    // Store payment transaction record
    const transactionId = `TXN_${Date.now()}_${uuidv4().substring(0, 8)}`;

    const { error } = await supabase
        .from('payment_transactions')
        .insert({
            order_id: orderId,
            transaction_id: transactionId,
            payment_method: paymentMethod,
            amount,
            status: 'PENDING',
            gateway_response: {
                razorpay_order_id: razorpayOrder.id,
            },
        });

    if (error) throw new Error(error.message);

    return {
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        orderId,
        keyId: process.env.RAZORPAY_KEY_ID || '',
    };
};

/**
 * Verify Razorpay payment signature and mark order as paid
 */
export const verifyPayment = async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
): Promise<PaymentVerificationResult> => {
    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body)
        .digest('hex');

    const isValid = expectedSignature === razorpaySignature;

    // Find the transaction by razorpay_order_id
    const { data: transaction, error: fetchError } = await supabase
        .from('payment_transactions')
        .select('*')
        .contains('gateway_response', { razorpay_order_id: razorpayOrderId })
        .single();

    if (fetchError || !transaction) {
        throw new Error('Transaction not found for this Razorpay order');
    }

    if (isValid) {
        // Update transaction to completed
        const { error: updateError } = await supabase
            .from('payment_transactions')
            .update({
                status: TransactionStatus.COMPLETED,
                gateway_response: {
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: razorpayPaymentId,
                    razorpay_signature: razorpaySignature,
                    verified: true,
                },
            })
            .eq('id', transaction.id);

        if (updateError) throw new Error(updateError.message);

        // Update order payment status to PAID
        const { error: orderError } = await supabase
            .from('orders')
            .update({
                payment_status: PaymentStatus.PAID,
                status: 'PROCESSING',
            })
            .eq('id', transaction.order_id);

        if (orderError) throw new Error(orderError.message);

        return {
            success: true,
            transactionId: transaction.transaction_id,
            message: 'Payment verified successfully',
        };
    } else {
        // Signature mismatch — mark as failed
        await supabase
            .from('payment_transactions')
            .update({
                status: TransactionStatus.FAILED,
                gateway_response: {
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: razorpayPaymentId,
                    verified: false,
                    reason: 'Signature verification failed',
                },
            })
            .eq('id', transaction.id);

        return {
            success: false,
            transactionId: transaction.transaction_id,
            message: 'Payment verification failed — signature mismatch',
        };
    }
};

/**
 * Handle Razorpay webhook events (payment.captured, payment.failed, etc.)
 */
export const handleWebhook = async (
    body: any,
    signature: string
): Promise<void> => {
    // Verify webhook signature
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
        .update(JSON.stringify(body))
        .digest('hex');

    if (expectedSignature !== signature) {
        throw new Error('Invalid webhook signature');
    }

    const event = body.event;
    const payment = body.payload?.payment?.entity;

    if (!payment) return;

    const razorpayOrderId = payment.order_id;

    // Find the transaction
    const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('*')
        .contains('gateway_response', { razorpay_order_id: razorpayOrderId })
        .single();

    if (!transaction) return;

    if (event === 'payment.captured') {
        await supabase
            .from('payment_transactions')
            .update({
                status: TransactionStatus.COMPLETED,
                gateway_response: {
                    ...transaction.gateway_response,
                    razorpay_payment_id: payment.id,
                    captured: true,
                    webhook_event: event,
                },
            })
            .eq('id', transaction.id);

        await supabase
            .from('orders')
            .update({
                payment_status: PaymentStatus.PAID,
                status: 'PROCESSING',
            })
            .eq('id', transaction.order_id);
    } else if (event === 'payment.failed') {
        await supabase
            .from('payment_transactions')
            .update({
                status: TransactionStatus.FAILED,
                gateway_response: {
                    ...transaction.gateway_response,
                    razorpay_payment_id: payment.id,
                    webhook_event: event,
                    error: payment.error_description,
                },
            })
            .eq('id', transaction.id);
    }
};

export const getPaymentStatus = async (orderId: string) => {
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

    const razorpayPaymentId = transaction.gateway_response?.razorpay_payment_id;
    if (!razorpayPaymentId) {
        throw new Error('No Razorpay payment ID found for this transaction');
    }

    // Issue refund via Razorpay
    await razorpay.payments.refund(razorpayPaymentId, {
        speed: 'normal',
    });

    // Update transaction
    await supabase
        .from('payment_transactions')
        .update({
            status: 'REFUNDED',
            gateway_response: {
                ...transaction.gateway_response,
                refunded: true,
                refund_timestamp: new Date().toISOString(),
            },
        })
        .eq('transaction_id', transactionId);

    // Update order
    await supabase
        .from('orders')
        .update({ payment_status: 'REFUNDED' })
        .eq('id', transaction.order_id);

    return true;
};

export const getAllPaymentMethods = (): PaymentMethod[] => {
    return [
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.DEBIT_CARD,
        PaymentMethod.UPI,
        PaymentMethod.NET_BANKING,
        PaymentMethod.WALLET,
        PaymentMethod.COD,
    ];
};

export const validatePaymentMethod = (method: string): boolean => {
    return Object.values(PaymentMethod).includes(method as PaymentMethod);
};
