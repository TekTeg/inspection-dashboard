import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

const getLocalDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  // --- USER STATE ---
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');

  // --- TODO STATE ---
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const API_BASE = 'https://inspection-dashboard-6ds8.onrender.com';

  // 1. Fetch Users on Initial Load
  useEffect(() => {
    fetch(`${API_BASE}/api/users`)
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        if (data.length > 0) setSelectedUserId(data[0].id); // Default to Ababa
      });
  }, []);

  // 2. Fetch Todos ONLY for the Selected User
  useEffect(() => {
    if (selectedUserId) {
      fetch(`${API_BASE}/api/todos?user_id=${selectedUserId}`)
        .then(res => res.json())
        .then(data => setTodos(data));
    }
  }, [selectedUserId]);

  const activeTasks = todos
    .filter(t => !t.is_completed)
    .sort((a, b) => b.sort_order - a.sort_order);
    
  const completedTasks = todos.filter(t => t.is_completed);
  
  const tasksForSelectedDate = completedTasks.filter(t => {
    const dbDate = t.completed_date ? t.completed_date.split('T')[0] : '';
    return dbDate === selectedDate;
  });

  // --- ACTIONS ---

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUserName })
    });
    if (res.ok) {
      const savedUser = await res.json();
      setUsers([...users, savedUser]);
      setSelectedUserId(savedUser.id); // Auto-switch to the new user
      setNewUserName('');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || !selectedUserId) return;

    const res = await fetch(`${API_BASE}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: newTask, user_id: selectedUserId })
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

  // --- Calendar Logic ---
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' });

  const graphData = calendarDays.map(day => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const tasksCompletedToday = completedTasks.filter(t => t.completed_date && t.completed_date.split('T')[0] === dateStr).length;
    
    return { 
      dateLabel: `${monthName.substring(0, 3)} ${day}`,
      tasks: tasksCompletedToday 
    };
  });

  const activeUserName = users.find(u => u.id === Number(selectedUserId))?.name || "Loading...";

  return (
    <div className="app-master-container">
      
      {/* --- NEW: USER SELECTION BAR --- */}
      <header className="user-bar">
        <div className="user-selector">
          <label><strong>Current User: </strong></label>
          <select 
            value={selectedUserId} 
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleAddUser} className="add-user-form">
          <input 
            type="text" 
            placeholder="New user name" 
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <button type="submit">Add User</button>
        </form>
      </header>

      <div className="app-layout">
        <main className="todo-section">
          <h1>{activeUserName}'s Tasks</h1>
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

      <section className="analytics-section">
        <h2>{activeUserName}'s Productivity: {monthName} {viewYear}</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fill: 'var(--text)', fontSize: 12 }} 
                tickMargin={10} 
              />
              <YAxis 
                allowDecimals={false} 
                tick={{ fill: 'var(--text)', fontSize: 12 }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
              />
              <Line 
                type="monotone" 
                dataKey="tasks" 
                name="Tasks Completed"
                stroke="var(--accent)" 
                strokeWidth={4} 
                dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 2 }}
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

    </div>
  );
}