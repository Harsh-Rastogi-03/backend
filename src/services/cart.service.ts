import supabase from '../utils/supabase';
import { CartItem, CartItemWithProduct } from '../types/database.types';

export const addToCart = async (
    userId: string,
    productId: string,
    quantity: number = 1,
    variantId?: string
): Promise<CartItem> => {
    // Check if item already exists in cart
    const { data: existing, error: checkError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('variant_id', variantId || null)
        .single();

    if (existing) {
        // Update quantity
        const { data, error } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // Add new item
    const { data, error } = await supabase
        .from('cart_items')
        .insert({
            user_id: userId,
            product_id: productId,
            variant_id: variantId || null,
            quantity
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getCart = async (userId: string): Promise<CartItemWithProduct[]> => {
    const { data, error } = await supabase
        .from('cart_items')
        .select(`
            *,
            product:products(*),
            variant:product_variants(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

export const updateCartItemQuantity = async (
    cartItemId: string,
    quantity: number
): Promise<CartItem> => {
    if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
    }

    const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const removeFromCart = async (cartItemId: string): Promise<void> => {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

    if (error) throw new Error(error.message);
};

export const clearCart = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
};

export const getCartTotal = async (userId: string): Promise<number> => {
    const cartItems = await getCart(userId);

    return cartItems.reduce((total, item) => {
        const price = item.variant?.price || item.product.price;
        return total + (price * item.quantity);
    }, 0);
};

export const getCartCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return count || 0;
};
