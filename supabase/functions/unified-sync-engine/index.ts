import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-topic, x-wc-webhook-resource, x-wc-webhook-event, x-wc-webhook-signature, x-wc-webhook-id, x-wc-webhook-source',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Identify the request type: Webhook (from WC) or Manual Sync (from Dashboard)
    const topic = req.headers.get('x-wc-webhook-topic');
    const authHeader = req.headers.get('Authorization');
    
    let userId: string | null = null;
    let isManualSync = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Manual sync from dashboard
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) throw new Error('Unauthorized');
      userId = user.id;
      isManualSync = true;
    } else if (topic) {
      // Webhook from WooCommerce
      const url = new URL(req.url);
      userId = url.searchParams.get('user_id');
      if (!userId) {
        console.warn('Webhook received without user_id in query params. Ignoring.');
        return new Response(JSON.stringify({ success: true, message: 'Skipped: No user_id' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        });
      }
    } else {
      throw new Error('Unrecognized request source');
    }

    const body = await req.json().catch(() => ({}));
    
    // --- MANUAL SYNC LOGIC ---
    if (isManualSync) {
      const { action } = body;
      if (!action) throw new Error('Missing manual action');

      // Fetch Credentials
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (settingsError || !settings) throw new Error('WooCommerce settings not found. Please configure API keys.');

      const actualUrl = (settings.woo_url || settings.website_url || '').trim().replace(/\/$/, '');
      const actualKey = (settings.woo_key || settings.consumer_key || '').trim();
      const actualSecret = (settings.woo_secret || settings.consumer_secret || '').trim();

      if (!actualUrl || !actualKey || !actualSecret) throw new Error('Incomplete credentials in settings.');

      const auth = btoa(`${actualKey}:${actualSecret}`);
      const headers = { 'Authorization': `Basic ${auth}` };
      
      let count = 0;
      let message = '';

      if (action === 'sync_orders') {
        const resp = await fetch(`${actualUrl}/wp-json/wc/v3/orders?per_page=50&status=any`, { headers });
        if (!resp.ok) throw new Error(`WC API Error (Orders): ${resp.status}`);
        const orders = await resp.json();
        
        if (Array.isArray(orders) && orders.length > 0) {
          const toUpsert = orders.map((o: any) => ({
            user_id: userId,
            order_id: o.id.toString(),
            customer_name: `${o.billing?.first_name || 'Guest'} ${o.billing?.last_name || ''}`.trim(),
            customer_phone: o.billing?.phone || '',
            amount: parseFloat(o.total) || 0,
            status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
            product_name: o.line_items?.[0]?.name || 'General',
            updated_at: new Date().toISOString()
          }));
          const { error } = await supabase.from('orders').upsert(toUpsert, { onConflict: 'user_id, order_id' });
          if (error) throw error;
          count = orders.length;
          message = `Synced ${count} orders.`;
        } else {
          message = 'No orders found.';
        }
      } else if (action === 'sync_products') {
        const resp = await fetch(`${actualUrl}/wp-json/wc/v3/products?per_page=100`, { headers });
        if (!resp.ok) throw new Error(`WC API Error (Products): ${resp.status}`);
        const products = await resp.json();

        if (Array.isArray(products) && products.length > 0) {
          const toUpsert = products.map((p: any) => ({
            user_id: userId,
            product_id: p.id.toString(),
            name: p.name,
            price: p.price,
            stock: p.stock_quantity || 0,
            category: p.categories?.[0]?.name || 'Uncategorized',
            updated_at: new Date().toISOString()
          }));
          const { error } = await supabase.from('products').upsert(toUpsert, { onConflict: 'user_id, product_id' });
          if (error) throw error;
          count = products.length;
          message = `Synced ${count} products.`;
        } else {
          message = 'No products found.';
        }
      } else if (action === 'sync_categories') {
        const resp = await fetch(`${actualUrl}/wp-json/wc/v3/products/categories?per_page=100`, { headers });
        if (!resp.ok) throw new Error(`WC API Error (Categories): ${resp.status}`);
        const categories = await resp.json();

        if (Array.isArray(categories) && categories.length > 0) {
          const toUpsert = categories.map((c: any) => ({
            user_id: userId,
            category_id: c.id.toString(),
            name: c.name,
            count: c.count || 0,
            updated_at: new Date().toISOString()
          }));
          const { error } = await supabase.from('categories').upsert(toUpsert, { onConflict: 'user_id, category_id' })
          if (error) throw error;
          count = categories.length;
          message = `Synced ${count} categories.`;
        } else {
          message = 'No categories found.';
        }
      } else {
        throw new Error('Invalid action');
      }

      return new Response(JSON.stringify({ success: true, count, message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // --- WEBHOOK LOGIC ---
    if (topic) {
      console.log(`Processing Webhook: ${topic} for User: ${userId}`);
      
      // Handle Order Webhooks
      if (topic.includes('order.created') || topic.includes('order.updated')) {
        const { error } = await supabase.from('orders').upsert({
          user_id: userId,
          order_id: body.id.toString(),
          customer_name: `${body.billing?.first_name || 'Guest'} ${body.billing?.last_name || ''}`.trim(),
          customer_phone: body.billing?.phone || '',
          amount: parseFloat(body.total) || 0,
          status: body.status.charAt(0).toUpperCase() + body.status.slice(1),
          product_name: body.line_items?.[0]?.name || 'General',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, order_id' });
        if (error) console.error('Webhook DB Error (Order):', error);
      }

      // Handle Product Webhooks
      if (topic.includes('product.created') || topic.includes('product.updated')) {
        const { error } = await supabase.from('products').upsert({
          user_id: userId,
          product_id: body.id.toString(),
          name: body.name,
          price: body.price,
          stock: body.stock_quantity || 0,
          category: body.categories?.[0]?.name || 'Uncategorized',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, product_id' });
        if (error) console.error('Webhook DB Error (Product):', error);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error('Fallback failure');

  } catch (err) {
    console.error('Edge Function System Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
