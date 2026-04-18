import { useState, useEffect } from 'react';
import './App.css';

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
  
  // NEW: State to track which task is being edited
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // ⚠️ Switch back to your Render URL when you are ready to deploy!
  // const API_BASE = 'http://localhost:3000'; 
const API_BASE = 'https://inspection-dashboard-6ds8.onrender.com';
  useEffect(() => {
    fetch(`${API_BASE}/api/todos`)
      .then(res => res.json())
      .then(data => setTodos(data));
  }, []);

  // Filter and SORT the active tasks by our new sort_order column
  const activeTasks = todos
    .filter(t => !t.is_completed)
    .sort((a, b) => b.sort_order - a.sort_order);
    
  const completedTasks = todos.filter(t => t.is_completed);
  
  const tasksForSelectedDate = completedTasks.filter(t => {
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
    const confirmDelete = window.confirm("Are you sure you want to delete this task forever?");
    if (!confirmDelete) return;
    const res = await fetch(`${API_BASE}/api/todos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTodos(todos.filter(t => t.id !== id));
    }
  };

  // --- NEW: Edit Logic ---
  const startEditing = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.task);
  };

  const saveEdit = async (id) => {
    const res = await fetch(`${API_BASE}/api/todos/${id}/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: editText })
    });
    if (res.ok) {
      const updatedTask = await res.json();
      setTodos(todos.map(t => t.id === id ? updatedTask : t));
      setEditingId(null);
    }
  };

  // --- NEW: Move Up/Down Logic ---
  const handleMove = async (currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentTodo = activeTasks[currentIndex];
    const targetTodo = activeTasks[targetIndex];

    // Grab each other's sort orders
    const newCurrentOrder = targetTodo.sort_order;
    const newTargetOrder = currentTodo.sort_order;

    // 1. Optimistic UI Update (Update screen instantly so it feels snappy)
    setTodos(todos.map(t => {
      if (t.id === currentTodo.id) return { ...t, sort_order: newCurrentOrder };
      if (t.id === targetTodo.id) return { ...t, sort_order: newTargetOrder };
      return t;
    }));

    // 2. Tell the database to perform the swap
    await fetch(`${API_BASE}/api/todos/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item1: { id: currentTodo.id, sort_order: newCurrentOrder },
        item2: { id: targetTodo.id, sort_order: newTargetOrder }
      })
    });
  };

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="app-layout">
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
          {activeTasks.map((todo, index) => (
            <li key={todo.id} className="task-item">
              <input 
                type="checkbox" 
                onChange={() => handleComplete(todo.id)} 
              />
              
              {/* If editing, show input box. If not, show normal text */}
              {editingId === todo.id ? (
                <div className="edit-mode">
                  <input 
                    type="text" 
                    value={editText} 
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                  />
                  <button onClick={() => saveEdit(todo.id)} className="save-edit-btn">Save</button>
                  <button onClick={() => setEditingId(null)} className="cancel-edit-btn">Cancel</button>
                </div>
              ) : (
                <span className="task-text">{todo.task}</span>
              )}

              {/* Action Buttons (Only show when not editing) */}
              {editingId !== todo.id && (
                <div className="task-actions">
                  <button onClick={() => startEditing(todo)} className="icon-btn" title="Edit">✏️</button>
                  
                  {/* Up/Down Arrows (Disable Up on the first item, Disable Down on the last item) */}
                  <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="icon-btn">⬆️</button>
                  <button onClick={() => handleMove(index, 'down')} disabled={index === activeTasks.length - 1} className="icon-btn">⬇️</button>
                  
                  <button onClick={() => handleDelete(todo.id)} className="icon-btn delete-btn" title="Delete">🗑️</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>

      <aside className="calendar-section">
        <h2>{today.toLocaleString('default', { month: 'long' })} {currentYear}</h2>
        <div className="calendar-grid">
          {calendarDays.map(day => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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