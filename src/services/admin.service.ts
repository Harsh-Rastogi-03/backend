import supabase from '../utils/supabase';

export const getDashboardStats = async () => {
    // Get total orders count
    const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

    // Get total products count
    const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    // Calculate total revenue
    const { data: orders } = await supabase
        .from('orders')
        .select('total');

    const totalRevenue = (orders || []).reduce((sum, order) => sum + Number(order.total), 0);

    // Get orders grouped by status
    const { data: allOrders } = await supabase
        .from('orders')
        .select('status');

    const ordersByStatus = (allOrders || []).reduce((acc: any[], order) => {
        const existing = acc.find(item => item.status === order.status);
        if (existing) {
            existing._count.id++;
        } else {
            acc.push({ status: order.status, _count: { id: 1 } });
        }
        return acc;
    }, []);

    // Get recent orders
    const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
            *,
            user:users(
                name,
                email
            )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    // Get last 30 days orders for sales graph
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: lastMonthOrders } = await supabase
        .from('orders')
        .select('created_at, total')
        .gte('created_at', thirtyDaysAgo.toISOString());

    return {
        totalOrders: totalOrders || 0,
        totalProducts: totalProducts || 0,
        totalRevenue,
        ordersByStatus,
        recentOrders: recentOrders || [],
        lastMonthOrders: lastMonthOrders || []
    };
};
