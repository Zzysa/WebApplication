import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

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
        console.error("Ошибка при загрузке элементов:", error);
        setMessage(`Ошибка при загрузке: ${error.message}. Бэкенд запущен?`);
      });
  }, []);

  const handleAddItem = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newItemName || 'Новый элемент (React)' }),
    })
      .then((res) => res.json())
      .then((newItem) => {
        setItems([...items, newItem]);
        setNewItemName('');
        setMessage(`Элемент "${newItem.name}" добавлен!`);
      })
      .catch((error) => {
        console.error("Ошибка при добавлении элемента:", error);
        setMessage(`Ошибка при добавлении: ${error.message}`);
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Микросервисное приложение</h1>
        {message && <p style={{color: 'yellow'}}>{message}</p>}
        <h2>Элементы из API:</h2>
        {items.length === 0 && !message.includes("Ошибка") && <p>Загрузка...</p>}
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
            placeholder="Имя нового элемента"
          />
          <button type="submit">Добавить элемент</button>
        </form>
      </header>
    </div>
  );
}

export default App;