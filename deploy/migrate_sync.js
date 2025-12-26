const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateSync() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
    });

    try {
        console.log('Running Full Sync Migration...');

        // 1. Add user_id to customers
        try {
            await connection.query("ALTER TABLE customers ADD COLUMN user_id CHAR(36)");
            console.log('Added user_id to customers');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('user_id already exists in customers');
            else throw e;
        }

        // 2. Add user_id to inventory
        try {
            await connection.query("ALTER TABLE inventory ADD COLUMN user_id CHAR(36)");
            console.log('Added user_id to inventory');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('user_id already exists in inventory');
            else throw e;
        }

        // 3. Create invoices table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
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
        console.log('Invoices table ready');

        // 4. Create invoice_items table
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
        console.log('Invoice items table ready');

        // 5. Create firm_settings table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS firm_settings (
        user_id CHAR(36) PRIMARY KEY,
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
        console.log('Firm settings table ready');

        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrateSync();
