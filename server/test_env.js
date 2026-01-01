require('dotenv').config({ path: '../.env.local' });
console.log('JWT_SECRET Found:', process.env.JWT_SECRET ? 'YES (Length: ' + process.env.JWT_SECRET.length + ')' : 'NO');
if (process.env.JWT_SECRET) {
    const startsWith = process.env.JWT_SECRET.substring(0, 5);
    console.log('Starts with:', startsWith);
}
