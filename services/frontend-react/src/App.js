import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000/api';

fetch(`${API_URL}/users`) 
fetch(`${API_URL}/products`)

function App() {
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/items`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((error) => {
        console.error("Error with loading elements:", error);
        setMessage(`Error with loading: ${error.message}. Is backend works?`);
      });
  }, []);

  const handleAddItem = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newItemName || 'New element (React)' }),
    })
      .then((res) => res.json())
      .then((newItem) => {
        setItems([...items, newItem]);
        setNewItemName('');
        setMessage(`Element "${newItem.name}" is added!`);
      })
      .catch((error) => {
        console.error("Error with adding new element:", error);
        setMessage(`Error with adding: ${error.message}`);
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Microservice app</h1>
        {message && <p style={{color: 'yellow'}}>{message}</p>}
        <h2>Элементы из API:</h2>
        {items.length === 0 && !message.includes("Error") && <p>Загрузка...</p>}
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
        <form onSubmit={handleAddItem}>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="New element name"
          />
          <button type="submit">Add element</button>
        </form>
      </header>
    </div>
  );
}

export default App;