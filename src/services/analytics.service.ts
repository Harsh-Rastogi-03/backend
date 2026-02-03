import supabase from '../utils/supabase';
import { SalesAnalytics } from '../types/database.types';

export const updateDailySalesAnalytics = async (date: string): Promise<SalesAnalytics> => {
    // Get all orders for the date
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

    if (ordersError) throw new Error(ordersError.message);

    // Calculate metrics
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0;

    // Get total items sold
    const orderIds = orders?.map(o => o.id) || [];
    let totalItemsSold = 0;

    if (orderIds.length > 0) {
        const { data: items } = await supabase
            .from('order_items')
            .select('quantity')
            .in('order_id', orderIds);

        totalItemsSold = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    }

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get new vs returning customers
    const userIds = orders?.map(o => o.user_id) || [];
    const uniqueUserIds = [...new Set(userIds)];

    let newCustomers = 0;
    let returningCustomers = 0;

    for (const userId of uniqueUserIds) {
        const { data: previousOrders } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', userId)
            .lt('created_at', `${date}T00:00:00`)
            .limit(1);

        if (previousOrders && previousOrders.length > 0) {
            returningCustomers++;
        } else {
            newCustomers++;
        }
    }

    // Upsert analytics record
    const { data, error } = await supabase
        .from('sales_analytics')
        .upsert({
            date,
            total_orders: totalOrders,
            total_revenue: totalRevenue,
            total_items_sold: totalItemsSold,
            average_order_value: averageOrderValue,
            new_customers: newCustomers,
            returning_customers: returningCustomers
        }, {
            onConflict: 'date'
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getSalesAnalytics = async (
    startDate: string,
    endDate: string
): Promise<SalesAnalytics[]> => {
    const { data, error } = await supabase
        .from('sales_analytics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
};

export const getRevenueByPeriod = async (days: number = 30) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('sales_analytics')
        .select('date, total_revenue, total_orders')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
};

export const getTopSellingProducts = async (limit: number = 10) => {
    const { data, error } = await supabase
        .from('order_items')
        .select(`
            product_id,
            quantity,
            product:products(name, price, images)
        `);

    if (error) throw new Error(error.message);

    // Aggregate by product
    const productSales = (data || []).reduce((acc: any, item: any) => {
        const productId = item.product_id;
        if (!acc[productId]) {
            acc[productId] = {
                product_id: productId,
                product: item.product,
                total_quantity: 0,
                total_revenue: 0
            };
        }
        acc[productId].total_quantity += item.quantity;
        acc[productId].total_revenue += item.quantity * item.product.price;
        return acc;
    }, {});

    // Sort and limit
    return Object.values(productSales)
        .sort((a: any, b: any) => b.total_quantity - a.total_quantity)
        .slice(0, limit);
};

export const getCustomerAnalytics = async () => {
    // Total customers
    const { count: totalCustomers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'CUSTOMER');

    // Customers with orders
    const { data: customersWithOrders } = await supabase
        .from('orders')
        .select('user_id')
        .eq('payment_status', 'PAID');

    const uniqueCustomers = new Set(customersWithOrders?.map(o => o.user_id) || []);

    // Average order value
    const { data: orders } = await supabase
        .from('orders')
        .select('total')
        .eq('payment_status', 'PAID');

    const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
    const averageOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
        total_customers: totalCustomers || 0,
        active_customers: uniqueCustomers.size,
        average_order_value: averageOrderValue,
        conversion_rate: totalCustomers ? (uniqueCustomers.size / totalCustomers) * 100 : 0
    };
};

export const getDashboardStats = async () => {
    // Today's date
    const today = new Date().toISOString().split('T')[0];

    // Get today's analytics
    const todayAnalytics = await updateDailySalesAnalytics(today);

    // Get total stats
    const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

    const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    const { count: totalCustomers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'CUSTOMER');

    // Get total revenue
    const { data: paidOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('payment_status', 'PAID');

    const totalRevenue = paidOrders?.reduce((sum, o) => sum + o.total, 0) || 0;

    // Get recent orders
    const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
            *,
            user:users(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    return {
        today: todayAnalytics,
        totals: {
            orders: totalOrders || 0,
            products: totalProducts || 0,
            customers: totalCustomers || 0,
            revenue: totalRevenue
        },
        recent_orders: recentOrders || []
    };
};
