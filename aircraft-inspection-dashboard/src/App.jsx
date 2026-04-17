import { useState, useEffect } from 'react';
import './App.css'; 

export default function App() {
  const [formData, setFormData] = useState({
    model: 'Boeing 777', 
    tailNumber: '',
    location: 'Everett Facility',
    notes: ''
  });

  const [inspectionLogs, setInspectionLogs] = useState([]);
  
  // NEW STATE: For managing the dynamic tail numbers
  const [tailNumbers, setTailNumbers] = useState([]);
  const [isAddingNewTail, setIsAddingNewTail] = useState(false);
  const [newTailInput, setNewTailInput] = useState('');

  // Fetch both Logs and Tail Numbers on load
  useEffect(() => {
    // ⚠️ REPLACE 'YOUR_RENDER_URL' WITH YOUR ACTUAL RENDER LINK
    const API_BASE = 'https://inspection-dashboard-6ds8.onrender.com'; 

    fetch(`${API_BASE}/api/logs`)
      .then(res => res.json())
      .then(data => setInspectionLogs(data));

    fetch(`${API_BASE}/api/tail-numbers`)
      .then(res => res.json())
      .then(data => {
        setTailNumbers(data);
        // Auto-select the first tail number if one exists
        if(data.length > 0) {
          setFormData(prev => ({ ...prev, tailNumber: data[0].tail_number }));
        }
      });
  }, []); 

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // --- NEW: Add a Tail Number to the Database ---
  const handleSaveNewTail = async () => {
    if (!newTailInput.trim()) return;
    
    try {
      // Your actual live Render server URL
      const API_BASE = 'https://inspection-dashboard-6ds8.onrender.com'; 
      
      const response = await fetch(`${API_BASE}/api/tail-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tail_number: newTailInput.toUpperCase() })
      });

      if (response.ok) {
        // Success!
        const savedTail = await response.json();
        setTailNumbers([...tailNumbers, savedTail]);
        setFormData(prev => ({ ...prev, tailNumber: savedTail.tail_number }));
        setIsAddingNewTail(false);
        setNewTailInput('');
      } else {
        // NO MORE SILENT FAILURES: Show the database error
        const errorText = await response.text();
        alert(`Failed to save: ${errorText}`);
      }
    } catch (error) {
       // Catches network errors (like the server being asleep)
       alert("Network Error: Could not reach the server. Is Render awake?");
       console.error(error);
    }
  };

  // --- NEW: Delete the currently selected Tail Number ---
  const handleDeleteTail = async () => {
    const tailToDelete = tailNumbers.find(t => t.tail_number === formData.tailNumber);
    if (!tailToDelete) return;

    const confirmDelete = window.confirm(`Permanently delete ${tailToDelete.tail_number}?`);
    if (!confirmDelete) return;

    const API_BASE = 'https://inspection-dashboard-6ds8.onrender.com';
    await fetch(`${API_BASE}/api/tail-numbers/${tailToDelete.id}`, { method: 'DELETE' });

    const updatedTails = tailNumbers.filter(t => t.id !== tailToDelete.id);
    setTailNumbers(updatedTails);
    setFormData(prev => ({ 
      ...prev, 
      tailNumber: updatedTails.length > 0 ? updatedTails[0].tail_number : '' 
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault(); 
    const API_BASE = 'https://inspection-dashboard-6ds8.onrender.com';
    
    const response = await fetch(`${API_BASE}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      const savedLog = await response.json();
      setInspectionLogs(prevLogs => [savedLog, ...prevLogs]);
      setFormData(prev => ({ ...prev, notes: '' })); // Only clear notes to save time on next entry
    }
  };

  return (
    <main className="dashboard-container">
      <h1>New Inspection Log</h1>
      <p>Enter structural check and maintenance details below.</p>

      <form onSubmit={handleSubmit} className="inspection-form">
        <div className="form-group">
          <label htmlFor="model">Aircraft Model:</label>
          <select name="model" value={formData.model} onChange={handleChange} required>
            <option value="Boeing 767">Boeing 767</option>
            <option value="Boeing 777">Boeing 777</option>
            <option value="Boeing 787 Dreamliner">Boeing 787 Dreamliner</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="location">Facility Location:</label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} required />
        </div>

        {/* --- UPDATED TAIL NUMBER UI --- */}
        <div className="form-group">
          <label>Tail Number:</label>
          
          {!isAddingNewTail ? (
            <div className="tail-manager">
              <select name="tailNumber" value={formData.tailNumber} onChange={handleChange} required>
                {tailNumbers.length === 0 && <option value="">-- No Tails Found --</option>}
                {tailNumbers.map(t => (
                  <option key={t.id} value={t.tail_number}>{t.tail_number}</option>
                ))}
              </select>
              <button type="button" className="action-btn" onClick={() => setIsAddingNewTail(true)}>+ Add</button>
              {tailNumbers.length > 0 && (
                <button type="button" className="action-btn delete-btn" onClick={handleDeleteTail}>🗑️</button>
              )}
            </div>
          ) : (
            <div className="tail-manager">
              <input 
  type="text" 
  value={newTailInput} 
  onChange={(e) => setNewTailInput(e.target.value)} 
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Stops the main form from submitting!
      handleSaveNewTail(); // Saves the tail number instead
    }
  }}
  placeholder="e.g. N12345" 
  autoFocus 
/>
              <button type="button" className="action-btn save-btn" onClick={handleSaveNewTail}>Save</button>
              <button type="button" className="action-btn cancel-btn" onClick={() => setIsAddingNewTail(false)}>Cancel</button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="notes">Inspection Notes:</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows="5" required />
        </div>

        <button type="submit" className="submit-btn">Submit Log</button>
      </form>

      <section className="logs-section">
        <h2>Recent Inspections</h2>
        {inspectionLogs.map(log => (
          <div key={log.id} className="log-card">
            <h3>{log.model} - {log.tail_number}</h3>
            <p><strong>Location:</strong> {log.location}</p>
            <p><strong>Logged at:</strong> {new Date(log.logged_at).toLocaleString()}</p>
            <p><strong>Notes:</strong> {log.notes}</p>
          </div>
        ))}
      </section>
    </main>
  );
}