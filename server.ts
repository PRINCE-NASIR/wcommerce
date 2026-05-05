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

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // WooCommerce Configuration
  let WOO_URL = (process.env.WOOCOMMERCE_URL || process.env.VITE_WOOCOMMERCE_URL || '').replace(/\/$/, '');
  let WOO_KEY = process.env.WOOCOMMERCE_KEY;
  let WOO_SECRET = process.env.WOOCOMMERCE_SECRET;
  let WEBHOOK_SECRET = process.env.WOOCOMMERCE_WEBHOOK_SECRET;

  const getWooAuth = () => {
    if (!WOO_KEY || !WOO_SECRET) return null;
    return Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString('base64');
  };

  // API to update configuration dynamically (volatile, for preview/demo)
  app.post('/api/config', (req, res) => {
    const { url, key, secret, webhookSecret } = req.body;
    if (url) WOO_URL = url.replace(/\/$/, '');
    if (key) WOO_KEY = key;
    if (secret) WOO_SECRET = secret;
    if (webhookSecret) WEBHOOK_SECRET = webhookSecret;
    
    res.json({ 
      status: 'Updated', 
      configured: !!(WOO_URL && WOO_KEY && WOO_SECRET) 
    });
  });

  // API: Get Products
  app.get('/api/products', async (req, res) => {
    try {
      const wooAuth = getWooAuth();
      if (!WOO_URL || !wooAuth) {
        return res.status(401).json({ 
          error: 'WooCommerce not configured', 
          details: 'Please log in and configure your WooCommerce URL and API Keys in the Settings tab.' 
        });
      }
      const response = await axios.get(`${WOO_URL}/wp-json/wc/v3/products?per_page=100`, {
        headers: { Authorization: `Basic ${wooAuth}` }
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
      const wooAuth = getWooAuth();
      if (!WOO_URL || !wooAuth) {
        return res.status(401).json({ error: 'WooCommerce not configured' });
      }
      const { id } = req.params;
      const cleanId = id.replace('PRD', ''); // Remove the UI prefix if present
      
      const response = await axios.delete(`${WOO_URL}/wp-json/wc/v3/products/${cleanId}?force=true`, {
        headers: { Authorization: `Basic ${wooAuth}` }
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
      const wooAuth = getWooAuth();
      if (!WOO_URL || !wooAuth) {
        return res.status(401).json({ 
          error: 'WooCommerce not configured',
          details: 'Please log in and configure your WooCommerce URL and API Keys in the Settings tab.'
        });
      }
      // Fetch recent completed orders to calculate stats
      const response = await axios.get(`${WOO_URL}/wp-json/wc/v3/orders?per_page=100&status=completed,processing`, {
        headers: { Authorization: `Basic ${wooAuth}` }
      });
      
      const orders = response.data;
      const totalSales = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total), 0);
      const orderCount = orders.length;
      const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

      res.json({
        totalSales,
        orderCount,
        avgOrderValue,
        recentOrders: orders.slice(0, 5) // Return some to sync initial state
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
