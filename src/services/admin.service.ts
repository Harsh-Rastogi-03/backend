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

    // Get total users count
    const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    // Get paid revenue
    const { data: paidOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('payment_status', 'PAID');

    const paidRevenue = (paidOrders || []).reduce((sum, order) => sum + Number(order.total), 0);

    return {
        totalOrders: totalOrders || 0,
        totalProducts: totalProducts || 0,
        totalUsers: totalUsers || 0,
        totalRevenue,
        paidRevenue,
        ordersByStatus,
        recentOrders: recentOrders || [],
        lastMonthOrders: lastMonthOrders || []
    };
};

export const getTransactions = async (page: number = 1, limit: number = 50) => {
    const offset = (page - 1) * limit;

    const { data: transactions, count } = await supabase
        .from('payment_transactions')
        .select(`
            *,
            order:orders(
                id,
                total,
                status,
                payment_status,
                user:users(name, email)
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    return {
        transactions: transactions || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
};

export const getShipments = async (page: number = 1, limit: number = 50) => {
    const offset = (page - 1) * limit;

    const { data: shipments, count } = await supabase
        .from('orders')
        .select(`
            id,
            total,
            status,
            payment_status,
            tracking_number,
            shipping_method,
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_zip,
            shipping_country,
            shipping_phone,
            shipped_at,
            delivered_at,
            cancelled_at,
            created_at,
            user:users(name, email, phone)
        `, { count: 'exact' })
        .not('tracking_number', 'is', null)
        .order('shipped_at', { ascending: false })
        .range(offset, offset + limit - 1);

    // Also get orders pending shipment (paid but no tracking)
    const { data: pendingShipment, count: pendingCount } = await supabase
        .from('orders')
        .select(`
            id,
            total,
            status,
            payment_status,
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_zip,
            created_at,
            user:users(name, email, phone)
        `, { count: 'exact' })
        .eq('payment_status', 'PAID')
        .is('tracking_number', null)
        .not('status', 'in', '("DELIVERED","CANCELLED")')
        .order('created_at', { ascending: false });

    return {
        shipments: shipments || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        pendingShipment: pendingShipment || [],
        pendingShipmentCount: pendingCount || 0
    };
};
