import Razorpay from 'razorpay';
import crypto from 'crypto';
import supabase from '../utils/supabase';
import { TransactionStatus, PaymentStatus, PaymentMethod } from '../types/database.types';
import { v4 as uuidv4 } from 'uuid';
import { autoCreateShipment } from './shiprocket.service';

// Lazy-initialize Razorpay to ensure env vars are loaded
let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
    if (!razorpayInstance) {
        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (!key_id || !key_secret) {
            throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment');
        }

        razorpayInstance = new Razorpay({ key_id, key_secret });
    }
    return razorpayInstance;
}

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
    amount: number
): Promise<RazorpayOrderResult> => {
    // Amount in paise (Razorpay expects smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    const razorpayOrder = await getRazorpay().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        notes: {
            orderId,
        },
    });

    // Store payment transaction record — payment_method is a placeholder,
    // updated to the actual method (upi/card/netbanking) after Razorpay verification
    const transactionId = `TXN_${Date.now()}_${uuidv4().substring(0, 8)}`;

    const { error } = await supabase
        .from('payment_transactions')
        .insert({
            order_id: orderId,
            transaction_id: transactionId,
            payment_method: 'UPI',
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
        // Fetch actual payment method from Razorpay
        let actualMethod: string | null = null;
        try {
            const paymentDetails = await getRazorpay().payments.fetch(razorpayPaymentId);
            actualMethod = paymentDetails.method || null; // 'upi', 'card', 'netbanking', 'wallet', etc.
        } catch (_) {
            // Non-critical — proceed without method info
        }

        // Update transaction to completed with actual payment method
        const updateData: Record<string, unknown> = {
            status: TransactionStatus.COMPLETED,
            gateway_response: {
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: razorpaySignature,
                verified: true,
                method: actualMethod,
            },
        };
        if (actualMethod) {
            const methodMap: Record<string, string> = {
                upi: 'UPI',
                card: 'CREDIT_CARD',
                netbanking: 'NET_BANKING',
                wallet: 'WALLET',
                emi: 'CREDIT_CARD',
                cardless_emi: 'WALLET',
                paylater: 'WALLET',
            };
            updateData.payment_method = methodMap[actualMethod] || 'UPI';
        }

        const { error: updateError } = await supabase
            .from('payment_transactions')
            .update(updateData)
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

        // Auto-create Shiprocket shipment (non-blocking)
        autoCreateShipment(transaction.order_id).catch((err) => {
            console.error('Auto-shipment background error:', err.message);
        });

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
 * @param rawBody - The raw request body string (for signature verification)
 * @param body - The parsed JSON body
 * @param signature - The x-razorpay-signature header
 */
export const handleWebhook = async (
    rawBody: string,
    body: any,
    signature: string
): Promise<void> => {
    // Verify webhook signature using raw body string
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
        .update(rawBody)
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

        // Auto-create Shiprocket shipment (non-blocking, skip if already created by verify)
        autoCreateShipment(transaction.order_id).catch((err) => {
            console.error('Auto-shipment webhook error:', err.message);
        });
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
    await getRazorpay().payments.refund(razorpayPaymentId, {
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
