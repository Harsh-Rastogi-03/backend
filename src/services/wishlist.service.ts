import supabase from '../utils/supabase';
import { Wishlist, WishlistWithProduct } from '../types/database.types';

export const addToWishlist = async (
    userId: string,
    productId: string
): Promise<Wishlist> => {
    // Check if already in wishlist
    const { data: existing } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

    if (existing) {
        throw new Error('Product already in wishlist');
    }

    const { data, error } = await supabase
        .from('wishlist')
        .insert({
            user_id: userId,
            product_id: productId
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getWishlist = async (userId: string): Promise<WishlistWithProduct[]> => {
    const { data, error } = await supabase
        .from('wishlist')
        .select(`
            *,
            product:products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

export const removeFromWishlist = async (
    userId: string,
    productId: string
): Promise<void> => {
    const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

    if (error) throw new Error(error.message);
};

export const isInWishlist = async (
    userId: string,
    productId: string
): Promise<boolean> => {
    const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

    return !!data && !error;
};

export const getWishlistCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return count || 0;
};

export const clearWishlist = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
};
