import { z } from 'zod';

export const ExpenseIdParamSchema = z.object({
  farmId: z.string().uuid(),
  expenseId: z.string().uuid()
});

export const CreateExpenseSchema = z.object({
  cropCycleId: z.string().uuid().optional().nullable(),
  category: z.enum([
    'SEEDS',
    'FERTILIZER',
    'LABOUR',
    'IRRIGATION',
    'PEST_MANAGEMENT',
    'MACHINERY',
    'TRANSPORT',
    'OTHER'
  ]),
  amount: z.coerce.number().positive('Expense amount must be positive'),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().trim().max(500).optional().nullable()
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export const ExpenseQuerySchema = z.object({
  category: z.enum([
    'SEEDS',
    'FERTILIZER',
    'LABOUR',
    'IRRIGATION',
    'PEST_MANAGEMENT',
    'MACHINERY',
    'TRANSPORT',
    'OTHER'
  ]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cropCycleId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  sort: z.enum(['expense_date', 'amount', 'category', 'created_at']).default('expense_date'),
  order: z.enum(['asc', 'desc']).default('desc')
});
