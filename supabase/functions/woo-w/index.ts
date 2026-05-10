
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const WOOC_SECRET = Deno.env.get('WOOCOMMERCE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  console.log("Request Method:", req.method);

  // Handle WooCommerce activation (GET/HEAD) and CORS (OPTIONS)
  if (req.method !== 'POST') {
    return new Response("OK", { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-signature, x-wc-webhook-topic',
      }
    });
  }

  // Handle POST request
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Critical: Environment variables missing");
      return new Response(JSON.stringify({ error: "Server Configuration Error" }), { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const bodyText = await req.text();
    if (!bodyText) {
      console.log("Empty payload received");
      return new Response("Empty payload", { status: 200 });
    }

    const payload = JSON.parse(bodyText);
    const topic = req.headers.get('x-wc-webhook-topic');
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    console.log(`Topic: ${topic}, User: ${userId}`);

    // Product Sync
    if ((topic === 'product.created' || topic === 'product.updated') && userId) {
      const { error } = await supabaseAdmin.from('products').upsert({
        user_id: userId,
        product_id: payload.id.toString(),
        name: payload.name,
        price: parseFloat(payload.price) || 0,
        stock_status: payload.stock_status,
        updated_at: new Date().toISOString()
      });
      if (error) console.error("Database Error (Product):", error);
    }

    // Order Sync
    if (topic === 'order.created' && userId) {
      const { error } = await supabaseAdmin.from('orders').upsert({
        user_id: userId,
        id: payload.id.toString(),
        customer_name: `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`,
        customer_phone: payload.billing?.phone || '',
        customer_address: `${payload.billing?.address_1 || ''}, ${payload.billing?.city || ''}`,
        total_amount: parseFloat(payload.total) || 0,
        status: 'Pending',
        updated_at: new Date().toISOString()
      });
      if (error) console.error("Database Error (Order):", error);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Function Crash Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
})
