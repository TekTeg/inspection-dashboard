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

// 1. Get ALL tasks (Now ordered by our new sort_order column!)
app.get('/api/todos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM todos ORDER BY sort_order DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 2. Add a new active task (Automatically sets its sort_order to match its new ID)
app.post('/api/todos', async (req, res) => {
    try {
        const { task } = req.body;
        const insertResult = await pool.query(
            'INSERT INTO todos (task) VALUES ($1) RETURNING *',
            [task]
        );
        const newId = insertResult.rows[0].id;
        
        // Update the new task to have a sort_order equal to its ID
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

// 6. NEW: Edit a task's text
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

// 7. NEW: Swap the sort_order of two tasks to move them up/down
app.put('/api/todos/reorder', async (req, res) => {
    try {
        const { item1, item2 } = req.body;
        // Update both items with their new swapped sort orders
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