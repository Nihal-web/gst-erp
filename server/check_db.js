const db = require('./db');
async function check() {
    try {
        const { rows: users } = await db.query('SELECT id, email, role, status FROM users');
        console.log('--- ALL USERS ---');
        users.forEach(u => console.log(JSON.stringify(u)));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
