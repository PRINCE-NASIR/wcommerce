
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
    // 1. Initialize Supabase Client with Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Authenticate User (Verify JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Invalid user token')

    const userId = user.id

    // 3. Parse Request Body
    const { wooUrl, wooKey, wooSecret, syncType, businessDetails } = await req.json()

    // --- CASE 1: Sync Business Settings ---
    if (syncType === 'settings' && businessDetails) {
      const { error: settingsError } = await supabaseAdmin
        .from('settings')
        .upsert({
          user_id: userId,
          business_name: businessDetails.name,
          business_phone: businessDetails.phone,
          business_website: businessDetails.website,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (settingsError) throw settingsError
      return new Response(JSON.stringify({ message: 'Settings synced' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // --- CASE 2: WooCommerce Data Sync ---
    if (!wooUrl || !wooKey || !wooSecret) throw new Error('WooCommerce credentials missing')

    // Normalize and validate URL
    let apiUrl = wooUrl.trim().replace(/\/$/, '')
    if (!apiUrl.startsWith('http')) {
      apiUrl = `https://${apiUrl}`
    }
    
    try {
      new URL(apiUrl)
    } catch (e) {
      throw new Error(`Invalid WooCommerce URL format: ${apiUrl}`)
    }

    const wooAuth = btoa(`${wooKey}:${wooSecret}`)
    const headers = { 'Authorization': `Basic ${wooAuth}` }

    // Logic for Categories
    if (syncType === 'categories' || syncType === 'all') {
      const resp = await fetch(`${apiUrl}/wp-json/wc/v3/products/categories?per_page=100`, { headers })
      const categories = await resp.json()
      
      if (Array.isArray(categories)) {
        const mappedCats = categories.map(c => ({
          user_id: userId,
          category_id: c.id.toString(),
          name: c.name,
          description: c.description || '',
          count: c.count || 0,
          updated_at: new Date().toISOString()
        }))

        const { error: catErr } = await supabaseAdmin.from('categories').upsert(mappedCats, { onConflict: 'user_id, category_id' })
        if (catErr) throw catErr
      }
    }

    // Logic for Orders
    if (syncType === 'orders' || syncType === 'all') {
      const resp = await fetch(`${apiUrl}/wp-json/wc/v3/orders?per_page=20`, { headers })
      const orders = await resp.json()

      if (Array.isArray(orders)) {
        const mappedOrders = orders.map(o => ({
          user_id: userId,
          order_id: o.id.toString(),
          customer_name: `${o.billing?.first_name} ${o.billing?.last_name}`.trim() || 'Guest',
          amount: parseFloat(o.total) || 0,
          status: o.status,
          product_category: o.line_items?.[0]?.product_id?.toString() || 'Uncategorized', // Simplified logic
          updated_at: new Date().toISOString()
        }))

        const { error: ordErr } = await supabaseAdmin.from('orders').upsert(mappedOrders, { onConflict: 'user_id, order_id' })
        if (ordErr) throw ordErr
      }
    }

    return new Response(JSON.stringify({ status: 'success', userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
