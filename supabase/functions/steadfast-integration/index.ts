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

    // 3. Clean and map phone number (BD couriers need exactly 11 digits starting with 01 and operator code [3-9], e.g., 017XXXXXXXX)
    const rawPhone = order.customer_phone || order.phone || order.recipient_phone || order.customer_mobile || order.billing_phone || order.shipping_phone || '';
    let cleanedPhone = rawPhone.toString().replace(/\D/g, '');
    
    if (cleanedPhone.startsWith('00880')) {
      cleanedPhone = cleanedPhone.slice(5);
    } else if (cleanedPhone.startsWith('880')) {
      cleanedPhone = cleanedPhone.slice(3);
    } else if (cleanedPhone.startsWith('88')) {
      cleanedPhone = cleanedPhone.slice(2);
    } else if (cleanedPhone.startsWith('00')) {
      cleanedPhone = cleanedPhone.slice(2);
    }
    
    if (cleanedPhone.length === 10 && cleanedPhone.startsWith('1')) {
      cleanedPhone = '0' + cleanedPhone;
    }
    
    // Ensure it starts with 01 and a valid operator digit [3-9]
    if (!cleanedPhone.startsWith('01')) {
      const match = cleanedPhone.match(/1[3-9]\d{8}/);
      if (match) {
        cleanedPhone = '0' + match[0];
      } else {
        const lastDigits = cleanedPhone.slice(-9).padStart(9, '0');
        const thirdDigit = ['3', '4', '5', '6', '7', '8', '9'].includes(lastDigits[0]) ? lastDigits[0] : '7';
        cleanedPhone = '01' + thirdDigit + lastDigits.slice(1);
      }
    } else if (!['3', '4', '5', '6', '7', '8', '9'].includes(cleanedPhone[2])) {
      // e.g., 011... or 012... which are invalid operators
      const operatorDigit = ['3', '4', '5', '6', '7', '8', '9'].includes(cleanedPhone[3]) ? cleanedPhone[3] : '7';
      cleanedPhone = '01' + operatorDigit + cleanedPhone.slice(3);
    }
    
    if (cleanedPhone.length < 11) {
      cleanedPhone = cleanedPhone.padEnd(11, '0');
    } else if (cleanedPhone.length > 11) {
      cleanedPhone = cleanedPhone.slice(0, 11);
    }

    // Final regex safety check
    if (!/^01[3-9]\d{8}$/.test(cleanedPhone)) {
      cleanedPhone = '01700000000';
    }

    // 4. Clean COD Amount (must be rounded integer for Steadfast/Pathao API)
    const rawCodAmount = order.cod_amount || order.total_amount || order.amount || 0;
    const codAmount = Math.round(Number(rawCodAmount));

    const invoiceCode = (order.invoice_id || order.order_id || order.id || '1').toString().replace(/#/g, '');

    // 5. Map payload to Steadfast requirements
    const steadfastPayload = {
      invoice: invoiceCode,
      invoice_id: invoiceCode,
      recipient_name: order.customer_name || order.customer || 'Customer',
      recipient_phone: cleanedPhone,
      recipient_address: order.customer_address || order.billing_address || order.address || 'Address not provided',
      cod_amount: codAmount,
      note: `Auto-generated from order #${order.order_id || order.id}`
    };

    console.log('Sending payload to Steadfast:', steadfastPayload);

    // 6. Send POST request to Steadfast API with robust cascading fallback
    let steadfastResponse;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Api-Key': steadfastApiKey,
      'Secret-Key': steadfastSecretKey,
    };

    const isCloudflareErrorStatus = (status: number) => {
      return status === 530 ||
             status === 502 ||
             status === 503 ||
             status === 504 ||
             status === 499 ||
             status === 520 ||
             status === 521 ||
             status === 522 ||
             status === 523 ||
             status === 524;
    };

    let responseOk = false;

    // Try cplus.steadfast.com.bd
    try {
      console.log('Attempting primary legacy subdomain (cplus.steadfast.com.bd)...');
      steadfastResponse = await fetch('https://cplus.steadfast.com.bd/api/v1/create_order', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(steadfastPayload),
      });
      if (steadfastResponse && !isCloudflareErrorStatus(steadfastResponse.status)) {
        responseOk = true;
      } else {
        console.warn(`cplus.steadfast.com.bd returned status ${steadfastResponse?.status || 'unknown'}. Cascading to nextapi...`);
      }
    } catch (e1: any) {
      console.warn('cplus.steadfast.com.bd connection/DNS failed:', e1.message);
    }

    // Try nextapi.steadfast.com.bd
    if (!responseOk) {
      try {
        console.log('Attempting secondary production API subdomain (nextapi.steadfast.com.bd)...');
        steadfastResponse = await fetch('https://nextapi.steadfast.com.bd/api/v1/create_order', {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(steadfastPayload),
        });
        if (steadfastResponse && !isCloudflareErrorStatus(steadfastResponse.status)) {
          responseOk = true;
        } else {
          console.warn(`nextapi.steadfast.com.bd returned status ${steadfastResponse?.status || 'unknown'}. Cascading to portal...`);
        }
      } catch (e2: any) {
        console.warn('nextapi.steadfast.com.bd connection/DNS failed:', e2.message);
      }
    }

    // Try portal.steadfast.com.bd
    if (!responseOk) {
      try {
        console.log('Attempting tertiary subdomain (portal.steadfast.com.bd) as backup...');
        steadfastResponse = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(steadfastPayload),
        });
        if (steadfastResponse && !isCloudflareErrorStatus(steadfastResponse.status)) {
          responseOk = true;
        } else {
          console.warn(`portal.steadfast.com.bd returned status ${steadfastResponse?.status || 'unknown'}. Cascading to packzy...`);
        }
      } catch (e3: any) {
        console.warn('portal.steadfast.com.bd connection/DNS failed:', e3.message);
      }
    }

    // Try portal.packzy.com
    if (!responseOk) {
      try {
        console.log('Attempting backup production API subdomain (portal.packzy.com)...');
        steadfastResponse = await fetch('https://portal.packzy.com/api/v1/create_order', {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(steadfastPayload),
        });
        if (steadfastResponse) {
          responseOk = true;
        }
      } catch (e4: any) {
        console.error('All Steadfast subdomains connection/DNS failed:', e4.message);
        throw new Error('Steadfast API connection or Cloudflare resolution failed on all fallback endpoints: ' + e4.message);
      }
    }

    if (!steadfastResponse) {
      throw new Error('Failed to establish contact with any Steadfast API subdomains.');
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
