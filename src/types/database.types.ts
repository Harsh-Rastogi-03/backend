export enum Role {
    CUSTOMER = 'CUSTOMER',
    ADMIN = 'ADMIN'
}

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    UPI = 'UPI',
    NET_BANKING = 'NET_BANKING',
    WALLET = 'WALLET',
    COD = 'COD'
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED'
}

export enum CouponType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED_AMOUNT = 'FIXED_AMOUNT',
    FREE_SHIPPING = 'FREE_SHIPPING'
}

export interface User {
    id: string;
    email: string;
    password: string;
    name?: string | null;
    phone?: string | null;
    role: Role;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    zip_code?: string | null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface RefreshToken {
    id: string;
    token: string;
    user_id: string;
    expires_at: string;
    created_at: string;
    revoked: boolean;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    sku: string;
    images: string[];
    category: string;
    tags: string[];
    is_active: boolean;
    // Enhanced fields
    brand?: string | null;
    model?: string | null;
    weight?: number | null;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    } | null;
    color_options?: string[];
    size_options?: string[];
    material?: string | null;
    warranty_period?: number;
    features?: string[];
    specifications?: Record<string, any> | null;
    rating_average?: number;
    rating_count?: number;
    review_count?: number;
    discount_percentage?: number;
    original_price?: number | null;
    is_featured?: boolean;
    is_bestseller?: boolean;
    is_new_arrival?: boolean;
    meta_title?: string | null;
    meta_description?: string | null;
    meta_keywords?: string[];
    created_at: string;
    updated_at: string;
}

export interface Order {
    id: string;
    user_id: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    total: number;
    shipping_address: string;
    shipping_city: string;
    shipping_zip: string;
    shipping_country: string;
    // Enhanced fields
    tracking_number?: string | null;
    shipping_method?: string | null;
    shipping_cost?: number;
    tax_amount?: number;
    discount_amount?: number;
    coupon_code?: string | null;
    notes?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    cancelled_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price: number;
}

export interface ProductReview {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    title?: string | null;
    comment: string;
    verified_purchase: boolean;
    helpful_count: number;
    created_at: string;
    updated_at: string;
}

export interface ProductVariant {
    id: string;
    product_id: string;
    sku: string;
    color?: string | null;
    size?: string | null;
    price?: number | null;
    stock: number;
    images?: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CartItem {
    id: string;
    user_id: string;
    product_id: string;
    variant_id?: string | null;
    quantity: number;
    created_at: string;
    updated_at: string;
}

export interface PaymentTransaction {
    id: string;
    order_id: string;
    transaction_id: string;
    payment_method: PaymentMethod;
    amount: number;
    status: TransactionStatus;
    gateway_response?: Record<string, any> | null;
    created_at: string;
    updated_at: string;
}

export interface Coupon {
    id: string;
    code: string;
    type: CouponType;
    value: number;
    min_purchase_amount: number;
    max_discount_amount?: number | null;
    usage_limit?: number | null;
    usage_count: number;
    valid_from: string;
    valid_until?: string | null;
    is_active: boolean;
    created_at: string;
}

export interface Wishlist {
    id: string;
    user_id: string;
    product_id: string;
    created_at: string;
}

export interface SalesAnalytics {
    id: string;
    date: string;
    total_orders: number;
    total_revenue: number;
    total_items_sold: number;
    average_order_value: number;
    new_customers: number;
    returning_customers: number;
    created_at: string;
    updated_at: string;
}

// Extended types with relations
export interface OrderWithItems extends Order {
    items: (OrderItem & { product: Product })[];
}

export interface OrderWithUser extends Order {
    user: Pick<User, 'name' | 'email'>;
    items: OrderItem[];
}

export interface RefreshTokenWithUser extends RefreshToken {
    user: User;
}

export interface ProductReviewWithUser extends ProductReview {
    user: Pick<User, 'name' | 'email'>;
}

export interface CartItemWithProduct extends CartItem {
    product: Product;
    variant?: ProductVariant | null;
}

export interface WishlistWithProduct extends Wishlist {
    product: Product;
}
