import { useState, useEffect } from 'react'; // NEW: We imported useEffect
import './App.css'; 

export default function App() {
  const [formData, setFormData] = useState({
    model: 'Boeing 777', 
    tailNumber: '',
    location: 'Everett Facility',
    notes: ''
  });

  const [inspectionLogs, setInspectionLogs] = useState([]);

  // --- NEW: Step 1. Fetching Data on Load ---
  // useEffect runs automatically when the component first appears on the screen
  useEffect(() => {
    fetch('http://localhost:3000/api/logs')
      .then(response => response.json())
      .then(data => {
        setInspectionLogs(data); // Put the server data into our React state
      })
      .catch(error => console.error("Error fetching logs:", error));
  }, []); // The empty array [] means "only do this once on load"


  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // --- UPDATED: Step 2. Submitting Data ---
  // Added 'async' so we can pause and wait for the server to respond
  const handleSubmit = async (event) => {
    event.preventDefault(); 
    
    try {
      // We send the POST request to our Node.js server
      const response = await fetch('http://localhost:3000/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' // Tell the server we are sending JSON
        },
        body: JSON.stringify(formData) // Package our form data
      });

      if (response.ok) {
        // The server sends back the newly saved log (with the ID and timestamp it generated)
        const savedLog = await response.json();
        
        // Add the official server record to our UI
        setInspectionLogs(prevLogs => [savedLog, ...prevLogs]);
        
        // Clear the form
        setFormData({
          model: 'Boeing 777',
          tailNumber: '',
          location: 'Everett Facility',
          notes: ''
        });
      }
    } catch (error) {
      console.error("Error saving log to server:", error);
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

        <div className="form-group">
          <label htmlFor="tailNumber">Tail Number:</label>
          <input type="text" name="tailNumber" value={formData.tailNumber} onChange={handleChange} placeholder="e.g., N12345" required />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Inspection Notes:</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows="5" required />
        </div>

        <button type="submit" className="submit-btn">Submit Log</button>
      </form>

      <section className="logs-section">
        <h2>Recent Inspections</h2>
        {inspectionLogs.length === 0 ? (
          <p>No inspections logged yet.</p>
        ) : (
          inspectionLogs.map(log => (
            <div key={log.id} className="log-card">
              <h3>{log.model} - {log.tail_number}</h3>
              <p><strong>Location:</strong> {log.location}</p>
              <p><strong>Logged at:</strong> {new Date(log.logged_at).toLocaleString()}</p>
              <p><strong>Notes:</strong> {log.notes}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}