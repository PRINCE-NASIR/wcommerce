
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get Signature and Topic from WooCommerce headers
    const signature = req.headers.get('x-wc-webhook-signature')
    const topic = req.headers.get('x-wc-webhook-topic')
    const rawBody = await req.text()
    
    // Get user_id from query params (Recommended way)
    const url = new URL(req.url)
    let userId = url.searchParams.get('user_id')

    if (!userId) {
      throw new Error('User ID missing from webhook URL (Add ?user_id=YOUR_UUID)')
    }

    // 2. Verify Signature (Security)
    // Note: User needs to set WOO_WEBHOOK_SECRET in Supabase Secrets
    const webhookSecret = Deno.env.get('WOO_WEBHOOK_SECRET')
    if (webhookSecret && signature) {
      const hmac = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      )
      
      const verified = await crypto.subtle.verify(
        'HMAC',
        hmac,
        Uint8Array.from(atob(signature), c => c.charCodeAt(0)),
        new TextEncoder().encode(rawBody)
      )

      if (!verified) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)
    console.log(`Processing ${topic} for user ${userId}`)

    // 3. Handle Topics
    if (topic === 'order.created') {
      const { error } = await supabaseAdmin.from('orders').upsert({
        user_id: userId,
        order_id: payload.id.toString(),
        customer_name: `${payload.billing?.first_name} ${payload.billing?.last_name}`.trim() || 'Guest',
        amount: parseFloat(payload.total) || 0,
        status: payload.status,
        product_category: payload.line_items?.[0]?.product_id?.toString() || 'Uncategorized',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, order_id' })
      
      if (error) throw error
    } 
    
    else if (topic === 'product.updated' || topic === 'product.created') {
      // Assuming a 'products' table exists based on your previous sync logic
      const { error } = await supabaseAdmin.from('products').upsert({
        user_id: userId,
        product_id: payload.id.toString(),
        name: payload.name,
        price: parseFloat(payload.price) || 0,
        stock_status: payload.stock_status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, product_id' })
      
      if (error) throw error
    }

    return new Response(JSON.stringify({ message: 'Webhook processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
