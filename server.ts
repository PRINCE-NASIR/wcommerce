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
  const rawUrl = (req.headers['x-woo-url'] as string) || (process.env.WOOCOMMERCE_URL || process.env.VITE_WOOCOMMERCE_URL || '').trim();
  const key = (req.headers['x-woo-key'] as string) || process.env.VITE_WOOCOMMERCE_KEY || process.env.WOOCOMMERCE_KEY;
  const secret = (req.headers['x-woo-secret'] as string) || process.env.VITE_WOOCOMMERCE_SECRET || process.env.WOOCOMMERCE_SECRET;
  
  if (!rawUrl || !key || !secret) return null;

  // Detect placeholder URLs
  if (rawUrl.includes('test.local') || rawUrl.includes('example.com') || rawUrl.includes('your-website.com')) {
    return { error: 'placeholder' };
  }

  // Normalize URL
  let url = rawUrl.trim().replace(/\/$/, '');
  if (url && !url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  try {
    new URL(url); // Validate URL format
  } catch (e) {
    console.error('Malformed WooCommerce URL:', url);
    return null;
  }
  
  return {
    url,
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
        details: 'Invalid or missing WooCommerce URL and API Keys. Use https://yourdomain.com format.' 
      });
    }
    
    if ('error' in config && config.error === 'placeholder') {
      return res.status(400).json({ 
        error: 'Placeholder URL detected', 
        details: 'You are using a placeholder website URL (test.local). Please go to Settings and enter your actual WooCommerce website address.' 
      });
    }

    const response = await axios.get(`${(config as any).url}/wp-json/wc/v3/products?per_page=100`, {
      headers: { Authorization: `Basic ${(config as any).auth}` },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error: any) {
    let status = error.response?.status || 500;
    let message = error.response?.data?.message || error.message;
    
    // Handle DNS/Network errors specifically
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ECONNREFUSED') {
      status = 404;
      message = `Could not reach website. Please check if the URL is correct and the site is online. (Error: ${error.code})`;
    }

    console.error(`WooCommerce API Error (Products) [${status}]:`, message);
    res.status(status).json({ 
      error: 'Failed to fetch products',
      details: message 
    });
  }
});

// API: Delete Product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const config = getWooConfig(req);
    if (!config) {
      return res.status(401).json({ 
        error: 'WooCommerce not configured',
        details: 'Invalid or missing WooCommerce URL and API Keys.'
      });
    }

    if ('error' in config && config.error === 'placeholder') {
      return res.status(400).json({ 
        error: 'Placeholder URL detected', 
        details: 'Please configure your actual WooCommerce URL in Settings.' 
      });
    }

    const { id } = req.params;
    const cleanId = id.replace('PRD', '');
    
    const response = await axios.delete(`${(config as any).url}/wp-json/wc/v3/products/${cleanId}?force=true`, {
      headers: { Authorization: `Basic ${(config as any).auth}` },
      timeout: 10000
    });
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    let status = error.response?.status || 500;
    let message = error.response?.data?.message || error.message;

    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ECONNREFUSED') {
      status = 404;
      message = `Could not reach website. (Error: ${error.code})`;
    }

    console.error(`WooCommerce API Error (Delete Product) [${status}]:`, message);
    res.status(status).json({ 
      error: 'Failed to delete product',
      details: message 
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
        details: 'Invalid or missing WooCommerce URL and API Keys. Use https://yourdomain.com format.'
      });
    }

    if ('error' in config && config.error === 'placeholder') {
      return res.status(400).json({ 
        error: 'Placeholder URL detected', 
        details: 'Please configure your actual WooCommerce URL in Settings.' 
      });
    }

    const response = await axios.get(`${(config as any).url}/wp-json/wc/v3/orders?per_page=100&status=completed,processing`, {
      headers: { Authorization: `Basic ${(config as any).auth}` },
      timeout: 10000
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
    let status = error.response?.status || 500;
    let message = error.response?.data?.message || error.message;

    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ECONNREFUSED') {
      status = 404;
      message = `Could not reach website. (Error: ${error.code})`;
    }

    console.error(`WooCommerce Stats Error [${status}]:`, message);
    res.status(status).json({ 
      error: 'Failed to fetch stats',
      details: message
    });
  }
});

// API: Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const config = getWooConfig(req);
    if (!config) {
      return res.status(401).json({ 
        error: 'WooCommerce not configured',
        details: 'Invalid or missing WooCommerce URL and API Keys. Use https://yourdomain.com format.'
      });
    }

    if ('error' in config && config.error === 'placeholder') {
      return res.status(400).json({ 
        error: 'Placeholder URL detected', 
        details: 'Please configure your actual WooCommerce URL in Settings.' 
      });
    }

    const response = await axios.get(`${(config as any).url}/wp-json/wc/v3/products/categories?per_page=100`, {
      headers: { Authorization: `Basic ${(config as any).auth}` },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error: any) {
    let status = error.response?.status || 500;
    let message = error.response?.data?.message || error.message;

    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ECONNREFUSED') {
      status = 404;
      message = `Could not reach website. (Error: ${error.code})`;
    }

    console.error(`WooCommerce API Error (Categories) [${status}]:`, message);
    res.status(status).json({ 
      error: 'Failed to fetch categories',
      details: message 
    });
  }
});

const WEBHOOK_SECRET = process.env.WOOCOMMERCE_WEBHOOK_SECRET || process.env.VITE_WOOCOMMERCE_WEBHOOK_SECRET;

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

  // API Routes listed first
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Standard static serving for production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Start the server
startServer();

export default app;
