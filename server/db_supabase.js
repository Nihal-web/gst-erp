const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Helper function to execute queries (mimics the old db.query interface)
async function query(sql, params = []) {
  try {
    // For raw SQL queries, we use the RPC approach or direct SQL
    // This is a basic wrapper that converts SQL to Supabase calls
    const { data, error } = await supabase.rpc('execute_query', {
      sql_query: sql,
      params: params
    });

    if (error) throw error;

    return { rows: data || [], fields: [] };
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

// Alternative: For better compatibility, use Supabase's PostgREST API
// This function provides query-building capabilities
const queryBuilder = {
  select: async (table, columns = '*', filters = {}) => {
    let query = supabase.from(table).select(columns);

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { rows: data || [], fields: [] };
  },

  insert: async (table, values) => {
    const { data, error } = await supabase
      .from(table)
      .insert([values]);

    if (error) throw error;
    return { rows: data || [], fields: [] };
  },

  update: async (table, values, filters) => {
    let query = supabase.from(table).update(values);

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { rows: data || [], fields: [] };
  },

  delete: async (table, filters) => {
    let query = supabase.from(table).delete();

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { rows: data || [], fields: [] };
  }
};

module.exports = {
  supabase,
  query,
  queryBuilder,
  // For backward compatibility with existing code
  getConnection: async () => ({
    query: query,
    beginTransaction: async () => { },
    commit: async () => { },
    rollback: async () => { },
    release: async () => { }
  })
};
