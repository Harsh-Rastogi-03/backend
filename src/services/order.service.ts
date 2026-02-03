import supabase from '../utils/supabase';
import { OrderStatus, PaymentStatus } from '../types/database.types';

interface CreateOrderInput {
    userId: string;
    items: { productId: string; quantity: number }[];
    shippingAddress: string;
    shippingCity: string;
    shippingZip: string;
    shippingCountry: string;
}

export const createOrder = async (data: CreateOrderInput) => {
    let total = 0;
    const orderItemsData = [];

    // 1. Validate Stock and Calculate Total
    for (const item of data.items) {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', item.productId)
            .single();

        if (error || !product) {
            throw new Error(`Product with ID ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product ${product.name}`);
        }

        const itemTotal = Number(product.price) * item.quantity;
        total += itemTotal;

        orderItemsData.push({
            product_id: item.productId,
            quantity: item.quantity,
            price: product.price,
            productStock: product.stock,
        });
    }

    // 2. Create Order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: data.userId,
            total: total,
            status: OrderStatus.PENDING,
            payment_status: PaymentStatus.PENDING,
            shipping_address: data.shippingAddress,
            shipping_city: data.shippingCity,
            shipping_zip: data.shippingZip,
            shipping_country: data.shippingCountry,
        })
        .select()
        .single();

    if (orderError || !order) {
        throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    // 3. Create Order Items and Update Stock
    try {
        for (const itemData of orderItemsData) {
            // Create order item
            const { error: itemError } = await supabase
                .from('order_items')
                .insert({
                    order_id: order.id,
                    product_id: itemData.product_id,
                    quantity: itemData.quantity,
                    price: itemData.price,
                });

            if (itemError) {
                throw new Error(`Failed to create order item: ${itemError.message}`);
            }

            // Update product stock
            const { error: stockError } = await supabase
                .from('products')
                .update({ stock: itemData.productStock - itemData.quantity })
                .eq('id', itemData.product_id);

            if (stockError) {
                throw new Error(`Failed to update stock: ${stockError.message}`);
            }
        }

        // Fetch complete order with items and products
        const { data: completeOrder, error: fetchError } = await supabase
            .from('orders')
            .select(`
                *,
                items:order_items(
                    *,
                    product:products(*)
                )
            `)
            .eq('id', order.id)
            .single();

        if (fetchError) {
            throw new Error(`Failed to fetch complete order: ${fetchError.message}`);
        }

        return completeOrder;
    } catch (error) {
        // Rollback: Delete the order if items creation failed
        await supabase.from('orders').delete().eq('id', order.id);
        throw error;
    }
};

export const getUserOrders = async (userId: string) => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            items:order_items(
                *,
                product:products(
                    name,
                    images,
                    slug
                )
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch user orders: ${error.message}`);
    }

    return data || [];
};

export const getAllOrders = async () => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            user:users(
                name,
                email
            ),
            items:order_items(*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch all orders: ${error.message}`);
    }

    return data || [];
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
    const updateData: any = { status };
    if (paymentStatus) {
        updateData.payment_status = paymentStatus;
    }

    const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update order status: ${error.message}`);
    }

    return data;
};
