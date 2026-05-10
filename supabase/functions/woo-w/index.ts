
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const WOOC_SECRET = Deno.env.get('WOOCOMMERCE_WEBHOOK_SECRET') || '';

serve(async (req) => {
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

  // 2. Handle POST request (actual data)
  if (req.method === 'POST') {
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const bodyText = await req.text();
      const signature = req.headers.get('x-wc-webhook-signature');
      const topic = req.headers.get('x-wc-webhook-topic');
      
      // Get user_id from query params (e.g., .../woo-w?user_id=abc)
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');

      console.log(`Received Webhook: ${topic} for User: ${userId}`);

      // Verify Signature (Optional but recommended for production)
      // Note: WooCommerce uses HMAC-SHA256 of the payload, then base64 encodes it.
      // If you want robust verification, you'd implement crypto here.

      const payload = JSON.parse(bodyText);

      // Simple Logic: Save product notification to a logs or products table
      if (topic === 'product.created' && userId) {
        // Example: Upsert to products table
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

      if (topic === 'order.created' && userId) {
        // Example: Upsert to orders table
        const { error } = await supabaseAdmin.from('orders').upsert({
          user_id: userId,
          id: payload.id.toString(),
          customer_name: `${payload.billing?.first_name} ${payload.billing?.last_name}`,
          customer_phone: payload.billing?.phone,
          customer_address: `${payload.billing?.address_1}, ${payload.billing?.city}`,
          total_amount: parseFloat(payload.total) || 0,
          status: 'Pending',
          updated_at: new Date().toISOString(),
          raw_webhook_payload: payload
        });
        if (error) console.error("Database Error (Order):", error);
      }

      return new Response(JSON.stringify({ success: true, message: "Webhook received" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (err) {
      console.error("Payload Error:", err.message);
      return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
})
