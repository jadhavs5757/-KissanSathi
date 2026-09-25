import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { env } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let pool = null;
let pgliteInstance = null;
let isPglite = false;

// If DATABASE_URL is provided, initialize standard pg Pool
if (env.DATABASE_URL && env.DATABASE_URL.trim() !== '') {
  try {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' && !env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
    });
    console.log('📦 Using PostgreSQL connection string from DATABASE_URL');
  } catch (err) {
    console.warn('⚠️ Could not initialize pg.Pool, falling back to embedded PGlite:', err.message);
    pool = null;
  }
}

// Fallback to embedded persistent PGlite (Real PostgreSQL in WASM)
async function getDb() {
  if (pool) {
    return {
      query: async (text, params = []) => {
        const res = await pool.query(text, params);
        return { rows: res.rows, rowCount: res.rowCount };
      },
      isPglite: false
    };
  }

  if (!pgliteInstance) {
    const dataDir = process.env.LOCALAPPDATA 
      ? path.join(process.env.LOCALAPPDATA, 'kisansaarthi_pg')
      : path.resolve(__dirname, '../data/pglite_db');

    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      pgliteInstance = new PGlite(dataDir);
      await pgliteInstance.waitReady;
      isPglite = true;
      console.log(`📦 Using persistent PostgreSQL (PGlite) at: ${dataDir}`);
    } catch (err) {
      console.warn('⚠️ Could not open persistent PGlite path, falling back to memory mode:', err.message);
      pgliteInstance = new PGlite();
      await pgliteInstance.waitReady;
      isPglite = true;
      console.log('📦 Using in-memory PostgreSQL (PGlite)');
    }
  }

  return {
    query: async (text, params = []) => {
      const res = await pgliteInstance.query(text, params);
      return { rows: res.rows, rowCount: res.rows?.length || 0 };
    },
    exec: async (sql) => {
      return pgliteInstance.exec(sql);
    },
    isPglite: true
  };
}

export const query = async (text, params = []) => {
  const db = await getDb();
  return db.query(text, params);
};

export const exec = async (sql) => {
  const db = await getDb();
  if (db.isPglite) {
    return db.exec(sql);
  }
  return pool.query(sql);
};

export const getPool = () => pool;

export default {
  query,
  exec,
  getDb,
  getPool
};
