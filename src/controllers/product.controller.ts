import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import { z } from 'zod';

const createProductSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(10),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
    category: z.string(),
    sku: z.string(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    slug: z.string().optional(),
});

const updateProductSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(10).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().nonnegative().optional(),
    category: z.string().optional(),
    sku: z.string().optional(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    slug: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const getProducts = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
        const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

        const filters = {
            category: req.query.category as string,
            search: req.query.search as string,
            minPrice,
            maxPrice,
            page,
            limit,
        };

        const result = await productService.getAllProducts(filters);
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

export const getProductBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const product = await productService.getProductBySlug(slug);
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.status(200).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        console.log('Received product data:', req.body);
        const validation = createProductSchema.safeParse(req.body);

        if (!validation.success) {
            console.log('Validation errors:', validation.error.issues);
            res.status(400).json({
                error: 'Validation failed',
                details: validation.error.issues
            });
            return;
        }

        const product = await productService.createProduct(validation.data);
        res.status(201).json(product);
    } catch (error: any) {
        console.error('Product creation error:', error);
        if (error.code === 'P2002') {
            res.status(409).json({ error: 'Product with this SKU or Slug already exists' });
            return;
        }
        res.status(500).json({ error: 'Failed to create product', details: error.message });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validation = updateProductSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({ error: validation.error.issues });
            return;
        }

        const product = await productService.updateProduct(id, validation.data);
        res.status(200).json(product);
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.status(500).json({ error: 'Failed to update product' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await productService.deleteProduct(id);
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error: any) {
        console.error(error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.status(500).json({ error: 'Failed to delete product' });
    }
};

export const getProductAnalytics = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const analytics = await productService.getProductAnalytics(id);

        if (!analytics) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.status(200).json(analytics);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch product analytics' });
    }
};
