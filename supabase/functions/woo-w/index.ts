import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-signature, x-wc-webhook-topic',
}

serve(async (req) => {
  // Log request for debugging in Supabase dashboard
  console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.url}`);

  // Handle WooCommerce activation test (GET/HEAD) and CORS (OPTIONS)
  if (req.method !== 'POST') {
    return new Response("Webhook Active", { 
      status: 200,
      headers: corsHeaders
    });
  }

  // Handle actual webhook data (POST)
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials in environment");
      return new Response(JSON.stringify({ error: "Configuration missing" }), { 
        status: 200, // Return 200 to WooCommerce to prevent disabling the hook
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const bodyText = await req.text();
    if (!bodyText || bodyText.trim() === '') {
      return new Response(JSON.stringify({ success: true, note: "Empty body" }), { status: 200 });
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      console.error("Invalid JSON:", bodyText);
      return new Response(JSON.stringify({ success: true, note: "Invalid JSON" }), { status: 200 });
    }

    // WooCommerce Ping (test when creating webhook)
    if (payload.webhook_id || payload.ping || !payload.id) {
       console.log("Ping/Test payload identified.");
       return new Response(JSON.stringify({ success: true, message: "Acknowledged" }), { status: 200 });
    }

    const topic = req.headers.get('x-wc-webhook-topic');
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    console.log(`Processing Topic: ${topic} for User: ${userId}`);

    if (userId) {
      // PRODUCT SYNC
      if (topic && (topic.includes('product.created') || topic.includes('product.updated'))) {
        const { error } = await supabase.from('products').upsert({
          user_id: userId,
          product_id: payload.id.toString(),
          name: payload.name || 'Untitled Product',
          price: parseFloat(payload.price) || 0,
          stock_status: payload.stock_status || 'instock',
          updated_at: new Date().toISOString()
        });
        if (error) console.error("DB Error (Product):", error);
      }

      // ORDER SYNC
      if (topic && topic.includes('order.created')) {
        const { error } = await supabase.from('orders').upsert({
          user_id: userId,
          id: payload.id.toString(),
          customer_name: `${payload.billing?.first_name || 'Guest'} ${payload.billing?.last_name || ''}`.trim(),
          customer_phone: payload.billing?.phone || '',
          customer_address: `${payload.billing?.address_1 || ''}, ${payload.billing?.city || ''}`.trim(),
          total_amount: parseFloat(payload.total) || 0,
          status: 'Pending',
          updated_at: new Date().toISOString()
        });
        if (error) console.error("DB Error (Order):", error);
      }
    } else {
      console.warn("No user_id found in URL. Payload was acknowledged but not saved.");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Critical Failure:", err.message);
    // Keep WooCommerce happy even on failure
    return new Response(JSON.stringify({ success: true, debug: err.message }), { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
})
