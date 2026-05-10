
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('STEADFAST_WEBHOOK_TOKEN'); // Optional: Secret token for validation

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse payload from Steadfast
    const body = await req.json();
    console.log('Received Steadfast Webhook:', body);

    // Security Check: If a token is configured, verify it
    // Note: Adjust according to Steadfast's specific header or payload field for tokens
    const clientToken = req.headers.get('X-Steadfast-Token') || body.token;
    if (webhookSecret && clientToken !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    /* 
      Steadfast Webhook Payload mapping (Example fields):
      body.consignment_id
      body.invoice_id
      body.status (delivered, cancelled, returned, etc.)
    */

    const { consignment_id, invoice_id, status } = body;

    if (!consignment_id && !invoice_id) {
      throw new Error('No consignment_id or invoice_id provided in webhook');
    }

    // Map Steadfast status to your internal statuses if needed
    let internalStatus = status;
    if (status === 'delivered') internalStatus = 'Delivered';
    if (status === 'cancelled') internalStatus = 'Cancelled';
    if (status === 'returned') internalStatus = 'Returned';

    // Update the order
    const query = supabaseAdmin.from('orders').update({
      status: internalStatus,
      updated_at: new Date().toISOString(),
      raw_webhook_payload: body // Useful for debugging
    });

    if (consignment_id) {
      query.eq('consignment_id', consignment_id);
    } else {
      query.eq('invoice_id', invoice_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify({ message: 'Webhook processed successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
