import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Retrieve environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Parse payload
    const body = await req.json();
    console.log('Incoming payload for Steadfast integration:', body);
    
    // Support both direct invocation ({ record }) and fallback webhook/direct formats
    const order = body.record || body;
    
    if (!order) {
      throw new Error('No order record found in payload');
    }

    // Determine the user_id
    const userId = order.user_id;
    if (!userId) {
      throw new Error('User ID not provided in order payload');
    }

    // 2. Fetch User Specific Courier Settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('steadfast_api_key, steadfast_secret_key')
      .eq('user_id', userId)
      .maybeSingle();

    const steadfastApiKey = settings?.steadfast_api_key || body.apiKey || order.apiKey || body.record?.apiKey;
    const steadfastSecretKey = settings?.steadfast_secret_key || body.secretKey || order.secretKey || body.record?.secretKey;

    if (!steadfastApiKey || !steadfastSecretKey) {
      console.error('Steadfast credentials missing for user:', userId);
      
      const orderId = order.order_id || order.id?.toString();
      if (orderId) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'Failed', updated_at: new Date().toISOString() })
          .eq('order_id', orderId)
          .eq('user_id', userId);
      }
        
      throw new Error('Courier credentials not configured by user. Please save your Steadfast keys in settings first.');
    }

    // 3. Clean and map phone number (BD couriers need 11 digits, e.g., 01XXXXXXXXX)
    let cleanedPhone = (order.customer_phone || order.phone || '').toString().replace(/\s+/g, '').replace(/[\-\(\)\+]/g, '');
    if (cleanedPhone.startsWith('880')) {
      cleanedPhone = cleanedPhone.slice(3);
    }
    if (cleanedPhone.startsWith('88')) {
      cleanedPhone = cleanedPhone.slice(2);
    }
    if (cleanedPhone.length === 10 && cleanedPhone.startsWith('1')) {
      cleanedPhone = '0' + cleanedPhone;
    }

    // 4. Clean COD Amount (must be rounded integer for Steadfast/Pathao API)
    const rawCodAmount = order.cod_amount || order.total_amount || order.amount || 0;
    const codAmount = Math.round(Number(rawCodAmount));

    // 5. Map payload to Steadfast requirements
    const steadfastPayload = {
      invoice_id: order.invoice_id || order.order_id || (order.id ? `#${order.id}` : undefined),
      recipient_name: order.customer_name || order.customer || 'Customer',
      recipient_phone: cleanedPhone,
      recipient_address: order.customer_address || order.billing_address || order.address || 'Address not provided',
      cod_amount: codAmount,
      note: `Auto-generated from order #${order.order_id || order.id}`
    };

    console.log('Sending payload to Steadfast:', steadfastPayload);

    // 6. Send POST request to Steadfast API (try both new and classic domains)
    let steadfastResponse;
    try {
      console.log('Attempting current production API subdomain (nextapi.steadfast.com.bd)...');
      steadfastResponse = await fetch('https://nextapi.steadfast.com.bd/api/v1/create_order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': steadfastApiKey,
          'Secret-Key': steadfastSecretKey,
        },
        body: JSON.stringify(steadfastPayload),
      });
    } catch (e1: any) {
      console.warn('nextapi.steadfast.com.bd failed. Attempting classic portal.steadfast.com.bd subdomain as backup...', e1.message);
      try {
        steadfastResponse = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': steadfastApiKey,
            'Secret-Key': steadfastSecretKey,
          },
          body: JSON.stringify(steadfastPayload),
        });
      } catch (e2: any) {
        throw new Error('Steadfast API resolution/connection error: ' + e1.message + ' / ' + e2.message);
      }
    }

    const result = await steadfastResponse.json();
    console.log('Steadfast API result:', result);

    const orderId = order.order_id || order.id?.toString();

    // 7. Handle Response
    if ((steadfastResponse.status === 200 && result.status === 200) || result.order) {
      const consignment_id = result.order?.consignment_id || result.consignment_id;
      const tracking_code = result.order?.tracking_code || result.tracking_code;

      if (orderId) {
        // Update the order in DB stably by user_id & order_id query
        await supabaseAdmin
          .from('orders')
          .update({
            consignment_id: consignment_id,
            tracking_code: tracking_code,
            status: 'Booked',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId)
          .eq('user_id', userId);
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Order booked successfully', 
        consignment_id, 
        tracking_code 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      console.error('Steadfast booking failed:', result);
      
      if (orderId) {
        await supabaseAdmin
          .from('orders')
          .update({ 
            status: 'Failed',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId)
          .eq('user_id', userId);
      }

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
