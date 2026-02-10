require('dotenv').config();

const { Pool } = require('pg');
const express = require('express');

const app = express();
const PORT = process.env.PORT;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.get('/', async (_, res) => {
    const result = await pool.query('SELECT version()');
    const { version } = result.rows[0];
    res.json({ version });
});

app.listen(PORT, () => {
    console.log(`Listening to http://localhost:${PORT}`);
});