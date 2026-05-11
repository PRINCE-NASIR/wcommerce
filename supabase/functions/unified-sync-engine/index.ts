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

    // 2. Parse request body
    const { action } = await req.json()
    if (!action) throw new Error('Missing action parameter')

    // 3. Fetch WooCommerce credentials
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('woo_url, woo_key, woo_secret')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings?.woo_key) {
      throw new Error('WooCommerce settings not found. Please configure API keys first.')
    }

    const { woo_url, woo_key, woo_secret } = settings
    const baseUrl = woo_url.replace(/\/$/, '')
    const auth = btoa(`${woo_key}:${woo_secret}`)

    let count = 0
    let message = ''

    switch (action) {
      case 'sync_orders': {
        const response = await fetch(`${baseUrl}/wp-json/wc/v3/orders?per_page=50&status=any`, {
          headers: { 'Authorization': `Basic ${auth}` }
        })
        if (!response.ok) throw new Error(`WooCommerce API Error: ${response.status}`)
        const orders = await response.json()
        
        if (orders.length > 0) {
          const toUpsert = orders.map((o: any) => ({
            user_id: userId,
            order_id: o.id.toString(),
            customer_name: `${o.billing?.first_name || 'Guest'} ${o.billing?.last_name || ''}`.trim(),
            customer_phone: o.billing?.phone || '',
            customer_address: `${o.billing?.address_1 || ''}, ${o.billing?.city || ''}`.trim(),
            product_name: o.line_items?.[0]?.name || 'General',
            product_category: 'WooCommerce', // Or try to fetch from first item
            product_price: parseFloat(o.line_items?.[0]?.price) || 0,
            delivery_charge: parseFloat(o.shipping_total) || 0,
            amount: parseFloat(o.total) || 0,
            cod_amount: o.payment_method === 'cod' ? parseFloat(o.total) : 0,
            status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
            order_date: o.date_created?.split('T')[0] || new Date().toISOString().split('T')[0],
            order_time: o.date_created?.split('T')[1] || new Date().toLocaleTimeString(),
            updated_at: new Date().toISOString()
          }))
          const { error } = await supabase.from('orders').upsert(toUpsert, { onConflict: 'user_id, order_id' })
          if (error) throw error
          count = orders.length
          message = 'Orders synchronized successfully'
        }
        break
      }

      case 'sync_products': {
        const response = await fetch(`${baseUrl}/wp-json/wc/v3/products?per_page=100`, {
          headers: { 'Authorization': `Basic ${auth}` }
        })
        if (!response.ok) throw new Error(`WooCommerce API Error: ${response.status}`)
        const products = await response.json()

        if (products.length > 0) {
          const toUpsert = products.map((p: any) => ({
            user_id: userId,
            product_id: p.id.toString(),
            name: p.name,
            price: p.price,
            stock: p.stock_quantity || 0,
            status: p.status,
            updated_at: new Date().toISOString()
          }))
          const { error } = await supabase.from('products').upsert(toUpsert, { onConflict: 'user_id, product_id' })
          if (error) throw error
          count = products.length
          message = 'Products synchronized successfully'
        }
        break
      }

      case 'sync_categories': {
        const response = await fetch(`${baseUrl}/wp-json/wc/v3/products/categories?per_page=100`, {
          headers: { 'Authorization': `Basic ${auth}` }
        })
        if (!response.ok) throw new Error(`WooCommerce API Error: ${response.status}`)
        const categories = await response.json()

        if (categories.length > 0) {
          const toUpsert = categories.map((c: any) => ({
            user_id: userId,
            category_id: c.id.toString(),
            name: c.name,
            description: c.description || '',
            count: c.count || 0,
            updated_at: new Date().toISOString()
          }))
          const { error } = await supabase.from('categories').upsert(toUpsert, { onConflict: 'user_id, category_id' })
          if (error) throw error
          count = categories.length
          message = 'Categories synchronized successfully'
        }
        break
      }

      default:
        throw new Error(`Invalid action: ${action}`)
    }

    return new Response(
      JSON.stringify({ success: true, count, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
