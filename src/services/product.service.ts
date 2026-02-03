import supabase from '../utils/supabase';
import { Product } from '../types/database.types';

export const getAllProducts = async (filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    page?: number;
    limit?: number;
}) => {
    const { category, minPrice, maxPrice, search, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

    // Apply filters
    if (category) {
        query = query.eq('category', category);
    }
    if (minPrice !== undefined) {
        query = query.gte('price', minPrice);
    }
    if (maxPrice !== undefined) {
        query = query.lte('price', maxPrice);
    }
    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
        throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return {
        data: products || [],
        meta: {
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
};

export const getProductBySlug = async (slug: string) => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data;
};

export const createProduct = async (data: any) => {
    const slug = data.slug || data.name.toLowerCase().replace(/ /g, '-') + '-' + Date.now();

    const { data: product, error } = await supabase
        .from('products')
        .insert({
            name: data.name,
            description: data.description,
            price: data.price,
            stock: data.stock,
            sku: data.sku,
            category: data.category,
            images: data.images || [],
            tags: data.tags || [],
            slug: slug,
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create product: ${error.message}`);
    }

    return product;
};

export const updateProduct = async (id: string, data: any) => {
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.sku) updateData.sku = data.sku;
    if (data.category) updateData.category = data.category;
    if (data.images) updateData.images = data.images;
    if (data.tags) updateData.tags = data.tags;
    if (data.slug) updateData.slug = data.slug;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: product, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update product: ${error.message}`);
    }

    return product;
};

export const deleteProduct = async (id: string) => {
    const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to delete product: ${error.message}`);
    }

    return data;
};

export const getProductAnalytics = async (productId: string) => {
    // Get product details
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (productError || !product) {
        return null;
    }

    // Get all order items for this product with order and user details
    const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
            *,
            order:orders(
                id,
                created_at,
                status,
                user:users(
                    id,
                    name,
                    email
                )
            )
        `)
        .eq('product_id', productId)
        .order('order(created_at)', { ascending: false });

    if (orderItemsError) {
        throw new Error(`Failed to fetch order items: ${orderItemsError.message}`);
    }

    const items = orderItems || [];

    // Calculate analytics
    const totalUnitsSold = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const totalOrders = new Set(items.map(item => item.order_id)).size;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get recent orders (last 10)
    const recentOrders = items.slice(0, 10).map(item => {
        const order = Array.isArray(item.order) ? item.order[0] : item.order;
        const user = Array.isArray(order.user) ? order.user[0] : order.user;

        return {
            orderId: order.id,
            customerName: user.name,
            customerEmail: user.email,
            quantity: item.quantity,
            price: item.price,
            total: Number(item.price) * item.quantity,
            orderDate: order.created_at,
            orderStatus: order.status,
        };
    });

    // Calculate sales by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: recentOrderItems, error: recentError } = await supabase
        .from('order_items')
        .select(`
            *,
            order:orders!inner(
                created_at
            )
        `)
        .eq('product_id', productId)
        .gte('order.created_at', sixMonthsAgo.toISOString());

    if (recentError) {
        throw new Error(`Failed to fetch recent order items: ${recentError.message}`);
    }

    // Group by month
    const monthlySales = (recentOrderItems || []).reduce((acc: any, item) => {
        const order = Array.isArray(item.order) ? item.order[0] : item.order;
        const month = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!acc[month]) {
            acc[month] = 0;
        }
        acc[month] += item.quantity;
        return acc;
    }, {});

    return {
        product,
        analytics: {
            totalUnitsSold,
            totalRevenue,
            totalOrders,
            averageOrderValue,
            currentStock: product.stock,
            stockStatus: product.stock > 10 ? 'Good' : product.stock > 0 ? 'Low' : 'Out of Stock',
        },
        recentOrders,
        monthlySales,
    };
};
