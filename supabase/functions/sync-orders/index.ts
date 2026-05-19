import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-topic, x-wc-webhook-signature, x-wc-webhook-resource, x-wc-webhook-event, x-wc-webhook-id, x-wc-webhook-source',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

async function verifySignature(secret: string, body: string, signature: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  // Convert signature bytes to base64
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  return signature === expectedSignature;
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const topic = req.headers.get('x-wc-webhook-topic');
    const authHeader = req.headers.get('Authorization');
    
    let userId: string | null = null;
    let isManualSync = false;

    // 1. Identification & Authentication
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError || !user) throw new Error('Unauthorized');
      userId = user.id;
      isManualSync = true;
    } else if (topic) {
      const url = new URL(req.url);
      userId = url.searchParams.get('user_id');
      if (!userId) {
        console.warn('Webhook missing user_id query param');
        return new Response('Missing user_id', { status: 200 }); // Return 200 to acknowledge WC
      }
    } else {
      throw new Error('Unrecognized request source');
    }

    // 2. Fetch User Settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settings) throw new Error('Settings not found. Please configure WooCommerce URL and Keys.');

    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};

    // 3. Webhook Signature Verification (If secret configured)
    if (topic && settings.woo_webhook_secret) {
      const signature = req.headers.get('x-wc-webhook-signature');
      if (signature) {
        const isValid = await verifySignature(settings.woo_webhook_secret, rawBody, signature);
        if (!isValid) {
          console.warn('Invalid webhook signature');
          return new Response('Invalid signature', { status: 401 });
        }
      }
    }

    const actualUrl = (settings.woo_url || settings.website_url || '').trim().replace(/\/$/, '');
    const actualKey = (settings.woo_key || settings.consumer_key || '').trim();
    const actualSecret = (settings.woo_secret || settings.consumer_secret || '').trim();

    if (!actualUrl || !actualKey) throw new Error('WooCommerce API keys not configured.');

    const auth = btoa(`${actualKey}:${actualSecret}`);
    const wcHeaders = { 'Authorization': `Basic ${auth}` };

    // 4. Processing
    if (isManualSync) {
      const { action } = body;
      if (!action) throw new Error('Missing sync action (sync_orders, sync_products, sync_categories)');

      let count = 0;
      let endpoint = '';
      
      if (action === 'sync_orders') endpoint = '/wp-json/wc/v3/orders';
      else if (action === 'sync_products') endpoint = '/wp-json/wc/v3/products';
      else if (action === 'sync_categories') endpoint = '/wp-json/wc/v3/products/categories';
      else throw new Error('Invalid action');

      // Pagination Loop
      let page = 1;
      let hasMore = true;
      const perPage = 100;

      while (hasMore && page <= 10) { // Limit to 10 pages for safety
        const resp = await fetch(`${actualUrl}${endpoint}?per_page=${perPage}&page=${page}&status=any`, { headers: wcHeaders });
        if (!resp.ok) throw new Error(`WC API Error: ${resp.status}`);
        
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) {
          hasMore = false;
          break;
        }

        if (action === 'sync_orders') {
          const toUpsert = data.map((o: any) => ({
            user_id: userId,
            order_id: o.id.toString(),
            customer_name: `${o.billing?.first_name || 'Guest'} ${o.billing?.last_name || ''}`.trim(),
            customer_phone: o.billing?.phone || '',
            amount: parseFloat(o.total) || 0,
            status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
            product_name: o.line_items?.[0]?.name || 'General',
            updated_at: new Date().toISOString()
          }));
          await supabase.from('orders').upsert(toUpsert, { onConflict: 'user_id, order_id' });
        } else if (action === 'sync_products') {
          const toUpsert = data.map((p: any) => ({
            user_id: userId,
            product_id: p.id.toString(),
            name: p.name,
            price: p.price,
            stock: p.stock_quantity || 0,
            category: p.categories?.[0]?.name || 'Uncategorized',
            updated_at: new Date().toISOString()
          }));
          await supabase.from('products').upsert(toUpsert, { onConflict: 'user_id, product_id' });
        } else if (action === 'sync_categories') {
          const toUpsert = data.map((c: any) => ({
            user_id: userId,
            category_id: c.id.toString(),
            name: c.name,
            count: c.count || 0,
            updated_at: new Date().toISOString()
          }));
          await supabase.from('categories').upsert(toUpsert, { onConflict: 'user_id, category_id' });
        }

        count += data.length;
        if (data.length < perPage) hasMore = false;
        else page++;
      }

      return new Response(JSON.stringify({ success: true, count, message: `Successfully synced ${count} items.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });

    } else {
      // WEBHOOK HANDLING
      console.log(`Processing webhook: ${topic} for user ${userId}`);
      
      if (topic.includes('order.created') || topic.includes('order.updated')) {
        await supabase.from('orders').upsert({
          user_id: userId,
          order_id: body.id.toString(),
          customer_name: `${body.billing?.first_name || 'Guest'} ${body.billing?.last_name || ''}`.trim(),
          customer_phone: body.billing?.phone || '',
          amount: parseFloat(body.total) || 0,
          status: body.status.charAt(0).toUpperCase() + body.status.slice(1),
          product_name: body.line_items?.[0]?.name || 'General',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, order_id' });
      } else if (topic.includes('product.created') || topic.includes('product.updated')) {
        await supabase.from('products').upsert({
          user_id: userId,
          product_id: body.id.toString(),
          name: body.name,
          price: body.price,
          stock: body.stock_quantity || 0,
          category: body.categories?.[0]?.name || 'Uncategorized',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, product_id' });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

  } catch (err: any) {
    console.error('Edge Function System Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
})
