import supabase from '../utils/supabase';
import { ProductReview, ProductReviewWithUser } from '../types/database.types';

export const createReview = async (
    productId: string,
    userId: string,
    rating: number,
    comment: string,
    title?: string
): Promise<ProductReview> => {
    // Validate rating
    if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
    }

    // Check if user has already reviewed this product
    const { data: existing } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        throw new Error('You have already reviewed this product');
    }

    // Check if user has purchased this product (for verified purchase flag)
    const { data: orders } = await supabase
        .from('orders')
        .select(`
            *,
            items:order_items(product_id)
        `)
        .eq('user_id', userId)
        .eq('payment_status', 'PAID');

    const hasPurchased = orders?.some(order =>
        order.items?.some((item: any) => item.product_id === productId)
    );

    // Create review
    const { data, error } = await supabase
        .from('product_reviews')
        .insert({
            product_id: productId,
            user_id: userId,
            rating,
            title,
            comment,
            verified_purchase: hasPurchased || false
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getProductReviews = async (
    productId: string,
    limit: number = 10,
    offset: number = 0
): Promise<ProductReviewWithUser[]> => {
    const { data, error } = await supabase
        .from('product_reviews')
        .select(`
            *,
            user:users(name, email)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return data || [];
};

export const getUserReviews = async (userId: string): Promise<ProductReviewWithUser[]> => {
    const { data, error } = await supabase
        .from('product_reviews')
        .select(`
            *,
            user:users(name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

export const updateReview = async (
    reviewId: string,
    userId: string,
    updates: {
        rating?: number;
        title?: string;
        comment?: string;
    }
): Promise<ProductReview> => {
    // Verify ownership
    const { data: review, error: fetchError } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('id', reviewId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !review) {
        throw new Error('Review not found or unauthorized');
    }

    // Validate rating if provided
    if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
    }

    const { data, error } = await supabase
        .from('product_reviews')
        .update(updates)
        .eq('id', reviewId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const deleteReview = async (reviewId: string, userId: string): Promise<void> => {
    // Verify ownership
    const { data: review, error: fetchError } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('id', reviewId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !review) {
        throw new Error('Review not found or unauthorized');
    }

    const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);

    if (error) throw new Error(error.message);
};

export const markReviewHelpful = async (reviewId: string): Promise<ProductReview> => {
    const { data: review, error: fetchError } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

    if (fetchError || !review) {
        throw new Error('Review not found');
    }

    const { data, error } = await supabase
        .from('product_reviews')
        .update({ helpful_count: review.helpful_count + 1 })
        .eq('id', reviewId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getReviewStats = async (productId: string) => {
    const { data: reviews, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId);

    if (error) throw new Error(error.message);

    if (!reviews || reviews.length === 0) {
        return {
            average: 0,
            total: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }

    const distribution = reviews.reduce((acc, review) => {
        acc[review.rating] = (acc[review.rating] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    return {
        average: Math.round(average * 10) / 10,
        total: reviews.length,
        distribution
    };
};
