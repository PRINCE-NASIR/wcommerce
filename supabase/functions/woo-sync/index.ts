import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Invalid token')

    const userId = user.id

    // 2. Fetch WooCommerce credentials from the settings table
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('website_url, consumer_key, consumer_secret')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings?.consumer_key) {
      throw new Error('WooCommerce settings not found. Please configure API keys first.')
    }

    const { website_url, consumer_key, consumer_secret } = settings
    const baseUrl = website_url.replace(/\/$/, '')

    // 3. Fetch orders from WooCommerce REST API
    const wooUrl = `${baseUrl}/wp-json/wc/v3/orders?per_page=50&status=any`
    const auth = btoa(`${consumer_key}:${consumer_secret}`)
    
    const response = await fetch(wooUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`WooCommerce API Error: ${response.status} - ${errText}`)
    }

    const wooOrders = await response.json()

    // 4. Map and Upsert into orders table
    if (wooOrders.length > 0) {
      const ordersToUpsert = wooOrders.map((o: any) => ({
        user_id: userId,
        order_id: o.id.toString(),
        customer_name: `${o.billing?.first_name || 'Guest'} ${o.billing?.last_name || ''}`.trim(),
        customer_phone: o.billing?.phone || '',
        customer_address: `${o.billing?.address_1 || ''}, ${o.billing?.city || ''}`.trim(),
        amount: parseFloat(o.total) || 0,
        status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
        product_category: o.line_items?.[0]?.name || 'General',
        updated_at: new Date().toISOString()
      }))

      const { error: upsertError } = await supabase
        .from('orders')
        .upsert(ordersToUpsert, { onConflict: 'user_id, order_id' })

      if (upsertError) throw upsertError
    }

    return new Response(
      JSON.stringify({ success: true, count: wooOrders.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
