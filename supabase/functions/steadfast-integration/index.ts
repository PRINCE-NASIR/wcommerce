
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
    // Retrieve environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // We'll fetch these from the DB now
    let steadfastApiKey = '';
    let steadfastSecretKey = '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Parse payload from Database Webhook
    const { record: order, table, schema, type } = await req.json();
    
    if (!order) {
      throw new Error('No order record found in payload');
    }

    // 2. Fetch User Specific Courier Settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('steadfast_api_key, steadfast_secret_key')
      .eq('user_id', order.user_id)
      .single();

    if (settingsError || !settings?.steadfast_api_key || !settings?.steadfast_secret_key) {
      console.error('Steadfast credentials missing for user:', order.user_id);
      
      // Log the failure in the order status
      await supabaseAdmin
        .from('orders')
        .update({ status: 'Failed', updated_at: new Date().toISOString() })
        .eq('id', order.id);
        
      throw new Error('Courier credentials not configured by user.');
    }

    steadfastApiKey = settings.steadfast_api_key;
    steadfastSecretKey = settings.steadfast_secret_key;

    // 3. Map payload to Steadfast requirements
    const steadfastPayload = {
      invoice_id: order.invoice_id || order.order_id || `#${order.id}`,
      recipient_name: order.customer_name || 'Customer',
      recipient_phone: order.customer_phone || '',
      recipient_address: order.customer_address || order.billing_address || 'Address not provided',
      cod_amount: order.total_amount || order.amount || 0,
      note: `Auto-generated from order #${order.id}`
    };

    console.log('Payload for Steadfast:', steadfastPayload);

    // 3. Send POST request to Steadfast API
    const steadfastResponse = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': steadfastApiKey,
        'Secret-Key': steadfastSecretKey,
      },
      body: JSON.stringify(steadfastPayload),
    });

    const result = await steadfastResponse.json();
    console.log('Steadfast API result:', result);

    // 4. Handle Response
    if (steadfastResponse.status === 200 && result.status === 200) {
      // Success: update order in Supabase with booking details
      const { consignment_id, tracking_code } = result.order;

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          consignment_id: consignment_id,
          tracking_code: tracking_code,
          status: 'Booked',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ 
        message: 'Order booked successfully', 
        consignment_id, 
        tracking_code 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Failure: Log error and update status to 'Failed'
      console.error('Steadfast booking failed:', result);
      
      const { error: failUpdateError } = await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'Failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (failUpdateError) console.error('Failed to update status to Failed:', failUpdateError);

      return new Response(JSON.stringify({ 
        error: 'Steadfast API failure', 
        details: result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

  } catch (error) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
