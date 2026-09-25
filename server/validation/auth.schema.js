import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: z.string().trim().regex(/^[0-9+() -]{7,15}$/, 'Invalid phone number format').optional().or(z.literal('')),
  preferred_language: z.string().trim().max(10).optional().default('en'),
  location: z.string().trim().max(200).optional().default('')
});

export const LoginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().regex(/^[0-9+() -]{7,15}$/, 'Invalid phone number format').optional().or(z.literal('')),
  preferred_language: z.string().trim().max(10).optional(),
  location: z.string().trim().max(200).optional()
});
