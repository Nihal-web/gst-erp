const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = {
    // mysql2 returns [rows, fields], we just want the rows most of the time
    query: async (sql, params) => {
        const [rows, fields] = await pool.execute(sql, params);
        return { rows, fields };
    },
    getConnection: () => pool.getConnection(),
};
