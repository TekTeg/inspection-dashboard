require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- TODO API ROUTES ---

// 1. Get ALL tasks (active and completed)
app.get('/api/todos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM todos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 2. Add a new active task
app.post('/api/todos', async (req, res) => {
    try {
        const { task } = req.body;
        const result = await pool.query(
            'INSERT INTO todos (task) VALUES ($1) RETURNING *',
            [task]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 3. Mark a task as complete and attach today's date
app.put('/api/todos/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.body; // Expecting 'YYYY-MM-DD' from frontend
        const result = await pool.query(
            'UPDATE todos SET is_completed = true, completed_date = $2 WHERE id = $1 RETURNING *',
            [id, date]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 4. Restore a task back to the active list
app.put('/api/todos/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE todos SET is_completed = false, completed_date = NULL WHERE id = $1 RETURNING *',
            [id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});