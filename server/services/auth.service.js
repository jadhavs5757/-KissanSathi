import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

export async function registerUser({ name, email, password, phone, preferred_language = 'en', location = '' }) {
  // Check if email already exists
  const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (existing.rows.length > 0) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  // Hash password with bcrypt (salt rounds 10)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert user
  const insertRes = await query(
    `INSERT INTO users (name, email, password_hash, phone, preferred_language, location)
     VALUES ($1, LOWER($2), $3, $4, $5, $6)
     RETURNING id, name, email, phone, preferred_language, location, created_at`,
    [name, email, passwordHash, phone || null, preferred_language, location]
  );

  const user = insertRes.rows[0];

  // Issue JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { user, token };
}

export async function loginUser({ email, password }) {
  // Find user
  const userRes = await query(
    'SELECT id, name, email, password_hash, phone, preferred_language, location, created_at FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );

  if (userRes.rows.length === 0) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const user = userRes.rows[0];

  // Compare password hash
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Issue JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token };
}

export async function getUserById(userId) {
  const res = await query(
    'SELECT id, name, email, phone, preferred_language, location, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  if (res.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }
  return res.rows[0];
}

export async function updateUserProfile(userId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    values.push(updates.phone || null);
  }
  if (updates.preferred_language !== undefined) {
    fields.push(`preferred_language = $${idx++}`);
    values.push(updates.preferred_language);
  }
  if (updates.location !== undefined) {
    fields.push(`location = $${idx++}`);
    values.push(updates.location);
  }

  if (fields.length === 0) {
    return getUserById(userId);
  }

  values.push(userId);
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, phone, preferred_language, location, created_at, updated_at`;
  const res = await query(sql, values);
  return res.rows[0];
}
