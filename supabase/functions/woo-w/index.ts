
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const bodyText = await req.text();
    if (!bodyText || bodyText.trim() === '') {
      console.log("Empty payload received");
      return new Response(JSON.stringify({ success: true, message: "Empty body" }), { status: 200 });
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      return new Response(JSON.stringify({ success: true, message: "Invalid JSON but acknowledged" }), { status: 200 });
    }

    const topic = req.headers.get('x-wc-webhook-topic');
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    console.log(`Topic: ${topic}, User: ${userId}`);

    // WooCommerce Ping/Test handling
    if (payload.webhook_id || payload.ping) {
       return new Response(JSON.stringify({ success: true, message: "Ping received" }), { status: 200 });
    }

    // Product Sync
    if ((topic === 'product.created' || topic === 'product.updated') && userId) {
      try {
        const { error } = await supabaseAdmin.from('products').upsert({
          user_id: userId,
          product_id: payload.id.toString(),
          name: payload.name || 'Untitled Product',
          price: parseFloat(payload.price) || 0,
          stock_status: payload.stock_status || 'instock',
          updated_at: new Date().toISOString()
        });
        if (error) console.error("Database Error (Product):", error);
      } catch (dbErr) {
        console.error("DB Write Error:", dbErr);
      }
    }

    // Order Sync
    if (topic === 'order.created' && userId) {
      try {
        const { error } = await supabaseAdmin.from('orders').upsert({
          user_id: userId,
          id: payload.id.toString(),
          customer_name: `${payload.billing?.first_name || 'Guest'} ${payload.billing?.last_name || ''}`.trim(),
          customer_phone: payload.billing?.phone || '',
          customer_address: `${payload.billing?.address_1 || ''}, ${payload.billing?.city || ''}`.trim(),
          total_amount: parseFloat(payload.total) || 0,
          status: 'Pending',
          updated_at: new Date().toISOString()
        });
        if (error) console.error("Database Error (Order):", error);
      } catch (dbErr) {
        console.error("DB Write Error:", dbErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Global Catch Error:", err);
    return new Response(JSON.stringify({ success: true, warning: err.message }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
})
