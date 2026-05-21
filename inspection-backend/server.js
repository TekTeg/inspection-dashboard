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

// --- NEW: USER API ROUTES ---

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Add a new user
app.post('/api/users', async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query(
            'INSERT INTO users (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- TODO API ROUTES ---

// 1. Get ALL tasks (Now filters by user_id)
app.get('/api/todos', async (req, res) => {
    try {
        const { user_id } = req.query;
        let query = 'SELECT * FROM todos ORDER BY sort_order DESC';
        let params = [];
        
        if (user_id) {
            query = 'SELECT * FROM todos WHERE user_id = $1 ORDER BY sort_order DESC';
            params = [user_id];
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 2. Add a new active task (Now attaches the task to a specific user_id)
app.post('/api/todos', async (req, res) => {
    try {
        const { task, user_id } = req.body;
        const insertResult = await pool.query(
            'INSERT INTO todos (task, user_id) VALUES ($1, $2) RETURNING *',
            [task, user_id || 1]
        );
        const newId = insertResult.rows[0].id;
        
        const finalResult = await pool.query(
            'UPDATE todos SET sort_order = $1 WHERE id = $2 RETURNING *',
            [newId, newId]
        );
        res.status(201).json(finalResult.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 3. Mark a task as complete
app.put('/api/todos/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.body; 
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

// 5. Delete a task permanently
app.delete('/api/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM todos WHERE id = $1', [id]);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 6. Edit a task's text
app.put('/api/todos/:id/edit', async (req, res) => {
    try {
        const { id } = req.params;
        const { task } = req.body;
        const result = await pool.query('UPDATE todos SET task = $1 WHERE id = $2 RETURNING *', [task, id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 7. Swap the sort_order of two tasks
app.put('/api/todos/reorder', async (req, res) => {
    try {
        const { item1, item2 } = req.body;
        await pool.query('UPDATE todos SET sort_order = $1 WHERE id = $2', [item1.sort_order, item1.id]);
        await pool.query('UPDATE todos SET sort_order = $1 WHERE id = $2', [item2.sort_order, item2.id]);
        res.json({ message: 'Reordered successfully' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});