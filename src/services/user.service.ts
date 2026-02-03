import supabase from '../utils/supabase';

export const getUserById = async (userId: string) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, name, phone, address, city, country, zip_code, role, created_at, password')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
};

export const updateUser = async (userId: string, data: any) => {
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.address) updateData.address = data.address;
    if (data.city) updateData.city = data.city;
    if (data.country) updateData.country = data.country;
    if (data.zipCode) updateData.zip_code = data.zipCode;

    const { data: user, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update user: ${error.message}`);
    }

    return user;
};

export const getAllUsers = async () => {
    // First get all users
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, name, phone, address, city, country, zip_code, role, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Get order counts for each user
    const usersWithCounts = await Promise.all(
        (users || []).map(async (user) => {
            const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            return {
                ...user,
                _count: {
                    orders: count || 0
                }
            };
        })
    );

    return usersWithCounts;
};

export const getUserWithOrders = async (userId: string) => {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, name, phone, address, city, country, zip_code, role, created_at')
        .eq('id', userId)
        .single();

    if (userError) {
        throw new Error(`Failed to fetch user: ${userError.message}`);
    }

    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
            *,
            items:order_items(
                *,
                product:products(*)
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (ordersError) {
        throw new Error(`Failed to fetch user orders: ${ordersError.message}`);
    }

    return {
        ...user,
        orders: orders || []
    };
};
