import { useState, useEffect } from 'react';
import './App.css';

// Helper function to get local date string as 'YYYY-MM-DD'
const getLocalDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));

  const API_BASE = 'https://inspection-dashboard-6ds8.onrender.com'; // Your live backend
// const API_BASE = 'http://localhost:3000'
  // Fetch all tasks on load
  useEffect(() => {
    fetch(`${API_BASE}/api/todos`)
      .then(res => res.json())
      .then(data => setTodos(data));
  }, []);

  // Filter tasks into active and completed categories
  const activeTasks = todos.filter(t => !t.is_completed);
  const completedTasks = todos.filter(t => t.is_completed);
  
  // Find completed tasks specifically for the currently selected calendar day
  const tasksForSelectedDate = completedTasks.filter(t => {
    // Postgres dates sometimes return with timezone data, we just want the 'YYYY-MM-DD' part
    const dbDate = t.completed_date ? t.completed_date.split('T')[0] : '';
    return dbDate === selectedDate;
  });

  // --- ACTIONS ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const res = await fetch(`${API_BASE}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: newTask })
    });
    const savedTask = await res.json();
    setTodos([savedTask, ...todos]);
    setNewTask('');
  };

  const handleComplete = async (id) => {
    const todayStr = getLocalDateString(new Date());
    const res = await fetch(`${API_BASE}/api/todos/${id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr })
    });
    if (res.ok) {
      const updatedTask = await res.json();
      setTodos(todos.map(t => t.id === id ? updatedTask : t));
    }
  };

  const handleRestore = async (id) => {
    const res = await fetch(`${API_BASE}/api/todos/${id}/restore`, { method: 'PUT' });
    if (res.ok) {
      const updatedTask = await res.json();
      setTodos(todos.map(t => t.id === id ? updatedTask : t));
    }
  };
const handleDelete = async (id) => {
    // Optional: Add a confirmation pop-up so you don't delete things by accident!
    const confirmDelete = window.confirm("Are you sure you want to delete this task forever?");
    if (!confirmDelete) return;

    const res = await fetch(`${API_BASE}/api/todos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // Filter out the deleted task from the state so it vanishes from the screen immediately
      setTodos(todos.filter(t => t.id !== id));
    }
  };
  // --- CALENDAR LOGIC (Current Month) ---
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="app-layout">
      {/* LEFT SIDE: Active To-Do List */}
      <main className="todo-section">
        <h1>Active Tasks</h1>
        <form onSubmit={handleAddTask} className="add-task-form">
          <input 
            type="text" 
            value={newTask} 
            onChange={(e) => setNewTask(e.target.value)} 
            placeholder="What needs to be done?" 
          />
          <button type="submit">Add</button>
        </form>

        <ul className="task-list">
          {activeTasks.length === 0 && <p className="empty-state">All caught up!</p>}
          {activeTasks.map(todo => (
            <li key={todo.id} className="task-item">
              <input 
                type="checkbox" 
                onChange={() => handleComplete(todo.id)} 
              />
              <span className="task-text">{todo.task}</span>
              <button onClick={() => handleDelete(todo.id)} className="delete-btn" title="Delete Task">🗑️</button>
            </li>
          ))}
        </ul>
      </main>

      {/* RIGHT SIDE: Calendar & Completed Tasks */}
      <aside className="calendar-section">
        <h2>{today.toLocaleString('default', { month: 'long' })} {currentYear}</h2>
        
        <div className="calendar-grid">
          {calendarDays.map(day => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            // Check if any tasks were completed on this specific day
            const hasCompletedTasks = completedTasks.some(t => t.completed_date && t.completed_date.split('T')[0] === dateStr);
            
            return (
              <div 
                key={day} 
                className={`calendar-day ${hasCompletedTasks ? 'has-tasks' : ''} ${selectedDate === dateStr ? 'selected' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="completed-logs">
          <h3>Completed on {selectedDate}</h3>
          {tasksForSelectedDate.length === 0 ? (
            <p className="empty-state">No tasks completed on this day.</p>
          ) : (
            <ul className="task-list completed-list">
              {tasksForSelectedDate.map(todo => (
                <li key={todo.id} className="task-item">
                  <span className="strikethrough">{todo.task}</span>
                  <button onClick={() => handleRestore(todo.id)} className="restore-btn">↩️ Restore</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}