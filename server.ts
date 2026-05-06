import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Use a helper to get WooCommerce config from request headers or environment variables
const getWooConfig = (req: express.Request) => {
  const url = (req.headers['x-woo-url'] as string) || (process.env.WOOCOMMERCE_URL || process.env.VITE_WOOCOMMERCE_URL || '').trim();
  const key = (req.headers['x-woo-key'] as string) || process.env.VITE_WOOCOMMERCE_KEY || process.env.WOOCOMMERCE_KEY;
  const secret = (req.headers['x-woo-secret'] as string) || process.env.VITE_WOOCOMMERCE_SECRET || process.env.WOOCOMMERCE_SECRET;
  
  if (!url || !key || !secret) return null;
  
  return {
    url: url.replace(/\/$/, ''),
    auth: Buffer.from(`${key}:${secret}`).toString('base64')
  };
};

// API: Get Products
app.get('/api/products', async (req, res) => {
  try {
    const config = getWooConfig(req);
    if (!config) {
      return res.status(401).json({ 
        error: 'WooCommerce not configured', 
        details: 'Please configure your WooCommerce URL and API Keys in the Settings tab.' 
      });
    }
    const response = await axios.get(`${config.url}/wp-json/wc/v3/products?per_page=100`, {
      headers: { Authorization: `Basic ${config.auth}` }
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('WooCommerce API Error (Products):', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch products',
      details: error.response?.data?.message || error.message 
    });
  }
});

// API: Delete Product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const config = getWooConfig(req);
    if (!config) {
      return res.status(401).json({ error: 'WooCommerce not configured' });
    }
    const { id } = req.params;
    const cleanId = id.replace('PRD', '');
    
    const response = await axios.delete(`${config.url}/wp-json/wc/v3/products/${cleanId}?force=true`, {
      headers: { Authorization: `Basic ${config.auth}` }
    });
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('WooCommerce API Error (Delete Product):', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to delete product',
      details: error.response?.data?.message || error.message 
    });
  }
});

// API: Get Stats
app.get('/api/stats', async (req, res) => {
  try {
    const config = getWooConfig(req);
    if (!config) {
      return res.status(401).json({ 
        error: 'WooCommerce not configured',
        details: 'Please configure your WooCommerce URL and API Keys in the Settings tab.'
      });
    }
    const response = await axios.get(`${config.url}/wp-json/wc/v3/orders?per_page=100&status=completed,processing`, {
      headers: { Authorization: `Basic ${config.auth}` }
    });
    
    const orders = response.data;
    const totalSales = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    res.json({
      totalSales,
      orderCount,
      avgOrderValue,
      recentOrders: orders.slice(0, 5)
    });
  } catch (error: any) {
    console.error('WooCommerce Stats Error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch stats' });
  }
});


// API: Webhook Receiver
app.post('/api/webhooks/orders', (req: any, res) => {
  const signature = req.headers['x-wc-webhook-signature'];
  const payload = req.rawBody;

  if (WEBHOOK_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.warn('Invalid Webhook Signature');
      return res.status(401).send('Invalid signature');
    }
  }

  console.log('Received WooCommerce Webhook:', req.body);
  
  // Broadcast update to all client
  io.emit('order_updated', req.body);
  
  res.status(200).send('Webhook received');
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Export app for Vercel
export default app;

if (process.env.NODE_ENV !== 'production') {
  startServer();
}
