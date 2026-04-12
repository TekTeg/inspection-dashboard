require('dotenv').config(); // Loads the .env file variables
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // NEW: The PostgreSQL client

const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json()); 

// --- NEW: Database Connection Pool ---
// A "Pool" manages multiple connections to your database efficiently
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Test the connection on startup
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL Database'))
    .catch(err => console.error('❌ Connection error', err.stack));

// --- REST API Routes ---

// 1. GET: Fetch all logs from the database
app.get('/api/logs', async (req, res) => {
    try {
        // Query the database, ordering by newest first
        const result = await pool.query('SELECT * FROM inspections ORDER BY logged_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 2. POST: Save a new log to the database
app.post('/api/logs', async (req, res) => {
    try {
        const { model, tailNumber, location, notes } = req.body;
        
        // Use parameterized queries ($1, $2) to prevent SQL injection security flaws!
        const newLog = await pool.query(
            `INSERT INTO inspections (model, tail_number, location, notes) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`, // RETURNING * tells Postgres to send back the newly created row
            [model, tailNumber, location, notes]
        );
        
        res.status(201).json(newLog.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
});