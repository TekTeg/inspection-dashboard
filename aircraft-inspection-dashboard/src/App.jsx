import { useState, useEffect } from 'react';
import './App.css';

const getLocalDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  // 1. ALL state goes inside the component!
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
  
  // Track which task is being edited
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // Track the month and year currently displayed on the calendar
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const API_BASE = 'https://inspection-dashboard-6ds8.onrender.com';

  useEffect(() => {
    fetch(`${API_BASE}/api/todos`)
      .then(res => res.json())
      .then(data => setTodos(data));
  }, []);

  // Filter and SORT the active tasks by our sort_order column
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

  // --- Edit Logic ---
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

  // --- Move Up/Down Logic ---
  const handleMove = async (currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentTodo = activeTasks[currentIndex];
    const targetTodo = activeTasks[targetIndex];

    const newCurrentOrder = targetTodo.sort_order;
    const newTargetOrder = currentTodo.sort_order;

    setTodos(todos.map(t => {
      if (t.id === currentTodo.id) return { ...t, sort_order: newCurrentOrder };
      if (t.id === targetTodo.id) return { ...t, sort_order: newTargetOrder };
      return t;
    }));

    await fetch(`${API_BASE}/api/todos/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item1: { id: currentTodo.id, sort_order: newCurrentOrder },
        item2: { id: targetTodo.id, sort_order: newTargetOrder }
      })
    });
  };

  // --- Calendar Navigation Logic ---
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11); // Loop back to December
      setViewYear(viewYear - 1); // Go back one year
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0); // Loop forward to January
      setViewYear(viewYear + 1); // Go forward one year
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Calculate days based on the VIEWED month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' });

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

              {editingId !== todo.id && (
                <div className="task-actions">
                  <button onClick={() => startEditing(todo)} className="icon-btn" title="Edit">✏️</button>
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
        <div className="calendar-header">
          <button onClick={handlePrevMonth} className="month-nav-btn">◀</button>
          <h2>{monthName} {viewYear}</h2>
          <button onClick={handleNextMonth} className="month-nav-btn">▶</button>
        </div>
        
        <div className="calendar-grid">
          {calendarDays.map(day => {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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