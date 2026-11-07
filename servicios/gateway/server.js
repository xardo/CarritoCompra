require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 4000;

// URL de los microservicios (en local o en Render)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4002';
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:4003';

app.use(cors());

// Health check del Gateway
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    microservices: {
      auth: AUTH_SERVICE_URL,
      products: PRODUCTS_SERVICE_URL,
      orders: ORDERS_SERVICE_URL
    },
    timestamp: new Date()
  });
});

// Proxy a Microservicio de Autenticación (/api/auth/*)
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': ''
    }
  })
);

// Proxy a Microservicio de Productos (/api/products/*)
app.use(
  '/api/products',
  createProxyMiddleware({
    target: PRODUCTS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/products': '/products'
    }
  })
);

// Proxy a Microservicio de Órdenes / Cálculo (/api/orders/*)
app.use(
  '/api/orders',
  createProxyMiddleware({
    target: ORDERS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/orders': ''
    }
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway corriendo en http://localhost:${PORT}`);
});
