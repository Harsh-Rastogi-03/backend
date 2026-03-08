import supabase from '../utils/supabase';

interface CreateAddressInput {
    userId: string;
    label?: string;
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    isDefault?: boolean;
}

interface UpdateAddressInput {
    label?: string;
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    isDefault?: boolean;
}

export const getUserAddresses = async (userId: string) => {
    const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch addresses: ${error.message}`);
    }

    return data || [];
};

export const getAddressById = async (addressId: string, userId: string) => {
    const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', addressId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        throw new Error('Address not found');
    }

    return data;
};

export const createAddress = async (input: CreateAddressInput) => {
    // If this is the first address, make it default
    const { count } = await supabase
        .from('addresses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', input.userId);

    const isDefault = input.isDefault ?? (count === 0);

    const { data, error } = await supabase
        .from('addresses')
        .insert({
            user_id: input.userId,
            label: input.label || 'Home',
            name: input.name,
            phone: input.phone,
            address: input.address,
            city: input.city,
            state: input.state,
            zip_code: input.zipCode,
            country: input.country || 'India',
            is_default: isDefault,
        })
        .select()
        .single();

    if (error || !data) {
        throw new Error(`Failed to create address: ${error?.message}`);
    }

    return data;
};

export const updateAddress = async (addressId: string, userId: string, input: UpdateAddressInput) => {
    const updateData: any = {};

    if (input.label !== undefined) updateData.label = input.label;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.state !== undefined) updateData.state = input.state;
    if (input.zipCode !== undefined) updateData.zip_code = input.zipCode;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.isDefault !== undefined) updateData.is_default = input.isDefault;

    const { data, error } = await supabase
        .from('addresses')
        .update(updateData)
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error || !data) {
        throw new Error(`Failed to update address: ${error?.message}`);
    }

    return data;
};

export const deleteAddress = async (addressId: string, userId: string) => {
    const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId);

    if (error) {
        throw new Error(`Failed to delete address: ${error.message}`);
    }
};
