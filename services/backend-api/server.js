const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let items = [
  { id: 1, name: 'Первый элемент из API' },
  { id: 2, name: 'Второй элемент из API' },
];
let nextId = 3;

app.get('/api/items', (req, res) => {
  console.log('GET /api/items - Запрос получен');
  res.json(items);
});

app.post('/api/items', (req, res) => {
  const newItem = {
    id: nextId++,
    name: req.body.name || `Элемент ${nextId - 1}`,
  };
  items.push(newItem);
  console.log('POST /api/items - Добавлен:', newItem);
  res.status(201).json(newItem);
});

app.listen(port, () => {
  console.log(`Бэкенд API запущен на http://localhost:${port}`);
});