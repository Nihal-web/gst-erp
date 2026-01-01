const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Use DATABASE_URL from Supabase (set this in Render environment variables)
// Example: postgres://postgres:password@db.host.supabase.co:5432/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
  // returns { rows, fields }
  query: async (text, params) => {
    const res = await pool.query(text, params);
    return { rows: res.rows, fields: res.fields || [] };
  },
  // get a client for transactions
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: (text, params) => client.query(text, params),
      beginTransaction: async () => client.query('BEGIN'),
      commit: async () => client.query('COMMIT'),
      rollback: async () => client.query('ROLLBACK'),
      release: () => client.release()
    };
  }
};
