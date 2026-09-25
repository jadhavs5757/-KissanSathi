import { query } from '../config/database.js';
import { getFarmById } from './farm.service.js';

export async function createExpense(farmId, userId, expenseData) {
  await getFarmById(farmId, userId);

  const {
    cropCycleId = null,
    category,
    amount,
    expenseDate,
    description = null
  } = expenseData;

  const res = await query(
    `INSERT INTO expenses (farm_id, crop_cycle_id, category, amount, expense_date, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [farmId, cropCycleId, category, amount, expenseDate, description]
  );

  return res.rows[0];
}

export async function getFarmExpenses(farmId, userId, filters = {}) {
  await getFarmById(farmId, userId);

  const conditions = ['e.farm_id = $1'];
  const values = [farmId];
  let idx = 2;

  if (filters.category) {
    conditions.push(`e.category = $${idx++}`);
    values.push(filters.category);
  }
  if (filters.cropCycleId) {
    conditions.push(`e.crop_cycle_id = $${idx++}`);
    values.push(filters.cropCycleId);
  }
  if (filters.from) {
    conditions.push(`e.expense_date >= $${idx++}`);
    values.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`e.expense_date <= $${idx++}`);
    values.push(filters.to);
  }
  if (filters.search) {
    conditions.push(`(e.description ILIKE $${idx} OR e.category ILIKE $${idx})`);
    values.push(`%${filters.search}%`);
    idx++;
  }

  const sortColumn = ['expense_date', 'amount', 'category', 'created_at'].includes(filters.sort)
    ? filters.sort
    : 'expense_date';
  const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

  const sql = `
    SELECT e.*, cc.crop_name, cc.variety
    FROM expenses e
    LEFT JOIN crop_cycles cc ON cc.id = e.crop_cycle_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.${sortColumn} ${sortOrder}, e.created_at DESC
  `;

  const listRes = await query(sql, values);

  // Calculate summary totals by category
  const summaryRes = await query(
    `SELECT category, SUM(amount) AS total, COUNT(*) AS count
     FROM expenses
     WHERE farm_id = $1
     GROUP BY category`,
    [farmId]
  );

  const categoryTotals = {};
  let totalAmount = 0;
  for (const row of summaryRes.rows) {
    categoryTotals[row.category] = Number(row.total);
    totalAmount += Number(row.total);
  }

  return {
    expenses: listRes.rows,
    categoryTotals,
    totalAmount
  };
}

export async function updateExpense(farmId, expenseId, userId, updateData) {
  await getFarmById(farmId, userId);

  const existRes = await query('SELECT id FROM expenses WHERE id = $1 AND farm_id = $2', [expenseId, farmId]);
  if (existRes.rows.length === 0) {
    const error = new Error('Expense not found.');
    error.statusCode = 404;
    error.code = 'EXPENSE_NOT_FOUND';
    throw error;
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (updateData.category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(updateData.category);
  }
  if (updateData.amount !== undefined) {
    fields.push(`amount = $${idx++}`);
    values.push(updateData.amount);
  }
  if (updateData.expenseDate !== undefined) {
    fields.push(`expense_date = $${idx++}`);
    values.push(updateData.expenseDate);
  }
  if (updateData.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(updateData.description);
  }
  if (updateData.cropCycleId !== undefined) {
    fields.push(`crop_cycle_id = $${idx++}`);
    values.push(updateData.cropCycleId);
  }

  if (fields.length === 0) {
    const res = await query('SELECT * FROM expenses WHERE id = $1', [expenseId]);
    return res.rows[0];
  }

  values.push(expenseId);
  values.push(farmId);
  const sql = `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${idx++} AND farm_id = $${idx} RETURNING *`;
  const res = await query(sql, values);
  return res.rows[0];
}

export async function deleteExpense(farmId, expenseId, userId) {
  await getFarmById(farmId, userId);

  const res = await query('DELETE FROM expenses WHERE id = $1 AND farm_id = $2 RETURNING id', [expenseId, farmId]);
  if (res.rows.length === 0) {
    const error = new Error('Expense not found.');
    error.statusCode = 404;
    error.code = 'EXPENSE_NOT_FOUND';
    throw error;
  }
  return { deleted: true, id: expenseId };
}
