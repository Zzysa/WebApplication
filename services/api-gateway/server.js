const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8000;

app.use(cors());

app.use((req, res, next) => {
  console.log(`[API Gateway] Received request: ${req.method} ${req.url}`);
  next();
});

app.use(
  '/api/users',
  createProxyMiddleware({
    target: 'http://user-service:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/users': '/users',
    },
  })
);

app.use(
  '/api/products',
  createProxyMiddleware({
    target: 'http://product-service:3002', 
    changeOrigin: true,
    pathRewrite: {
      '^/api/products': '/products',
    },
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
});