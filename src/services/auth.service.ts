import supabase from '../utils/supabase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { User, Role } from '../types/database.types';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    role: z.enum(['CUSTOMER', 'ADMIN']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const generateTokens = async (userId: string, role: string) => {
    const accessToken = jwt.sign({ userId, role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '15m',
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { error } = await supabase.from('refresh_tokens').insert({
        token: refreshToken,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
    });

    if (error) {
        throw new Error(`Failed to create refresh token: ${error.message}`);
    }

    return { accessToken, refreshToken };
};

export const register = async (data: z.infer<typeof registerSchema>) => {
    // Check if user already exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', data.email)
        .single();

    if (existingUser) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const { data: user, error } = await supabase
        .from('users')
        .insert({
            email: data.email,
            password: hashedPassword,
            name: data.name || null,
            role: data.role || 'CUSTOMER',
        })
        .select()
        .single();

    if (error || !user) {
        throw new Error(`Failed to create user: ${error?.message}`);
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
};

export const login = async (data: z.infer<typeof loginSchema>) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', data.email)
        .single();

    if (error || !user) {
        throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
};

export const refreshToken = async (token: string) => {
    const { data: storedToken, error } = await supabase
        .from('refresh_tokens')
        .select(`
            *,
            user:users(*)
        `)
        .eq('token', token)
        .single();

    if (error || !storedToken || storedToken.revoked || new Date() > new Date(storedToken.expires_at)) {
        throw new Error('Invalid refresh token');
    }

    // Revoke old token
    await supabase
        .from('refresh_tokens')
        .update({ revoked: true })
        .eq('id', storedToken.id);

    const user = Array.isArray(storedToken.user) ? storedToken.user[0] : storedToken.user;
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(storedToken.user_id, user.role);

    return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (token: string) => {
    await supabase
        .from('refresh_tokens')
        .update({ revoked: true })
        .eq('token', token);
};
