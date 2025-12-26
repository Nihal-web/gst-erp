const mysql = require('mysql2/promise');
require('dotenv').config();

async function runFinalMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
  });

  try {
    console.log('🚀 Starting Final Comprehensive Migration...');

    // 1. Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'ADMIN',
        shop_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        plan VARCHAR(20) DEFAULT 'pro',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ensured with password_hash and plan fields.');

    // Migration for existing users table: Rename password to password_hash if it exists
    try {
      await connection.query("ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255) NOT NULL");
      console.log('✅ Renamed password to password_hash in users table.');
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') console.log('ℹ️ No password column in users or already renamed.');
      else console.warn('⚠️ Warning renaming users.password:', e.message);
    }

    // 2. Add 'plan' column to 'users' if it doesn't exist
    try {
      await connection.query("ALTER TABLE users ADD COLUMN plan VARCHAR(20) DEFAULT 'pro'");
      console.log('✅ Added plan column to users.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ Plan column already exists.');
      else throw e;
    }

    // 3. Customers Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id CHAR(36) PRIMARY KEY,
        tenant_id CHAR(36),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        gstin VARCHAR(50),
        state VARCHAR(100),
        state_code VARCHAR(10),
        country VARCHAR(100) DEFAULT 'India',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Customers table ensured with tenant_id.');

    // 4. Inventory Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id CHAR(36) PRIMARY KEY,
        tenant_id CHAR(36),
        name VARCHAR(255) NOT NULL,
        hsn VARCHAR(50),
        sac VARCHAR(50),
        rate DECIMAL(15, 2) NOT NULL,
        unit VARCHAR(50) DEFAULT 'NOS',
        stock DECIMAL(15, 2) DEFAULT 0,
        gst_percent DECIMAL(5, 2) DEFAULT 18,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Inventory table ensured with tenant_id.');

    // 5. Invoices Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id CHAR(36) PRIMARY KEY,
        tenant_id CHAR(36) NOT NULL,
        customer_id CHAR(36) NOT NULL,
        invoice_no VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        date VARCHAR(50) NOT NULL,
        total_taxable DECIMAL(15, 2) NOT NULL,
        igst DECIMAL(15, 2) DEFAULT 0,
        cgst DECIMAL(15, 2) DEFAULT 0,
        sgst DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) NOT NULL,
        is_paid BOOLEAN DEFAULT FALSE,
        is_reverse_charge BOOLEAN DEFAULT FALSE,
        export_type VARCHAR(50),
        shipping_bill_no VARCHAR(50),
        shipping_bill_date VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Invoices table ensured with tenant_id.');

    // 6. Invoice Items Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id CHAR(36) NOT NULL,
        product_id CHAR(36),
        product_name VARCHAR(255) NOT NULL,
        hsn VARCHAR(50),
        sac VARCHAR(50),
        qty DECIMAL(15, 2) NOT NULL,
        rate DECIMAL(15, 2) NOT NULL,
        unit VARCHAR(50),
        taxable_value DECIMAL(15, 2) NOT NULL,
        gst_percent DECIMAL(5, 2) NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Invoice Items table ensured.');

    // 7. Firm Settings Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS firm_settings (
        tenant_id CHAR(36) PRIMARY KEY,
        name VARCHAR(255),
        tagline VARCHAR(255),
        address TEXT,
        pan VARCHAR(50),
        gstin VARCHAR(50),
        phone VARCHAR(50),
        email VARCHAR(255),
        web VARCHAR(255),
        bank_name VARCHAR(255),
        bank_branch VARCHAR(255),
        acc_number VARCHAR(255),
        ifsc VARCHAR(50),
        upi_id VARCHAR(255),
        terms TEXT,
        state VARCHAR(100),
        state_code VARCHAR(10),
        declaration TEXT
      )
    `);
    console.log('✅ Firm Settings table ensured with tenant_id.');

    // 8. System Settings Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        name VARCHAR(100) PRIMARY KEY,
        value VARCHAR(255)
      )
    `);
    // Seed system settings if empty
    await connection.query(`
      INSERT IGNORE INTO system_settings (name, value) VALUES 
      ('payments_enabled', 'true'),
      ('products_enabled', 'true'),
      ('maintenance_mode', 'false'),
      ('signups_enabled', 'true')
    `);
    console.log('✅ System Settings table ensured and seeded (including SaaS toggles).');

    // 9. Stock Logs Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stock_logs (
        id CHAR(36) PRIMARY KEY,
        tenant_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        product_name VARCHAR(255),
        change_amt DECIMAL(15, 2) NOT NULL,
        reason VARCHAR(255),
        date VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Stock Logs table ensured with tenant_id.');

    // 10. Rename user_id to tenant_id if necessary
    const tablesToFix = ['customers', 'inventory', 'invoices', 'firm_settings', 'stock_logs'];
    for (const table of tablesToFix) {
      try {
        await connection.query(`ALTER TABLE ${table} CHANGE COLUMN user_id tenant_id CHAR(36)`);
        console.log(`✅ Renamed user_id to tenant_id in ${table}.`);
      } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') console.log(`ℹ️ No user_id in ${table} or already renamed.`);
        else console.warn(`⚠️ Warning renaming ${table}:`, e.message);
      }
    }

    console.log('🏆 Migration Finished Successfully.');
  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await connection.end();
  }
}

runFinalMigration();
