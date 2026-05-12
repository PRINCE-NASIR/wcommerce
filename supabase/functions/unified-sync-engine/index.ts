import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
}

serve(async (req) => {
  console.log(`${req.method} request to unified-sync-engine`)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing Authorization header')
      throw new Error('No authorization header')
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Invalid token')
    }

    const userId = user.id
    console.log(`User authenticated: ${userId}`)

    // 2. Parse request body
    let body
    try {
      body = await req.json()
    } catch (e) {
      console.error('Failed to parse body:', e)
      throw new Error('Invalid JSON body')
    }
    
    const { action } = body
    if (!action) throw new Error('Missing action parameter')

    console.log(`Action: ${action}`)

    // 3. Fetch WooCommerce credentials
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('woo_url, woo_key, woo_secret')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings?.woo_url) {
      console.error('Settings error:', settingsError)
      throw new Error('WooCommerce settings not found. Please configure URL, Key, and Secret in settings.')
    }

    const { woo_url, woo_key, woo_secret } = settings
    if (!woo_url || !woo_key || !woo_secret) {
      throw new Error('Incomplete WooCommerce settings. Please provide URL, Key, and Secret.')
    }

    let baseUrl = woo_url.trim().replace(/\/$/, '')
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`
    }
    
    console.log(`Using base URL: ${baseUrl}`)
    const auth = btoa(`${woo_key}:${woo_secret}`)

    let count = 0
    let message = ''

    switch (action) {
      case 'sync_orders': {
        console.log(`Fetching orders for user: ${userId}`)
        const response = await fetch(`${baseUrl}/wp-json/wc/v3/orders?per_page=50&status=any`, {
          headers: { 'Authorization': `Basic ${auth}` }
        })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`WooCommerce API Error (Orders): ${response.status} - ${errorText}`)
        }
        const orders = await response.json()
        
        if (orders.length > 0) {
          const toUpsert = orders.map((o: any) => ({
            user_id: userId,
            order_id: o.id.toString(),
            customer_name: `${o.billing?.first_name || 'Guest'} ${o.billing?.last_name || ''}`.trim(),
            customer_phone: o.billing?.phone || '',
            customer_address: `${o.billing?.address_1 || ''}, ${o.billing?.city || ''}`.trim(),
            product_name: o.line_items?.[0]?.name || 'General',
            product_category: 'WooCommerce', 
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
          if (error) {
            console.error('Supabase Upsert Error (Orders):', error)
            throw error
          }
          count = orders.length
          message = 'Orders synchronized successfully'
        } else {
          message = 'No orders found to synchronize'
        }
        break
      }

      case 'sync_products': {
        console.log(`Fetching products for user: ${userId}`)
        const response = await fetch(`${baseUrl}/wp-json/wc/v3/products?per_page=100`, {
          headers: { 'Authorization': `Basic ${auth}` }
        })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`WooCommerce API Error (Products): ${response.status} - ${errorText}`)
        }
        const products = await response.json()

        if (products.length > 0) {
          const toUpsert = products.map((p: any) => ({
            user_id: userId,
            product_id: p.id.toString(),
            name: p.name,
            price: p.price,
            stock: p.stock_quantity || 0,
            category: p.categories?.[0]?.name || 'Uncategorized',
            status: p.status,
            updated_at: new Date().toISOString()
          }))
          const { error } = await supabase.from('products').upsert(toUpsert, { onConflict: 'user_id, product_id' })
          if (error) {
            console.error('Supabase Upsert Error (Products):', error)
            throw error
          }
          count = products.length
          message = 'Products synchronized successfully'
        } else {
          message = 'No products found to synchronize'
        }
        break
      }

      case 'sync_categories': {
        console.log(`Fetching categories for user: ${userId}`)
        const response = await fetch(`${baseUrl}/wp-json/wc/v3/products/categories?per_page=100`, {
          headers: { 'Authorization': `Basic ${auth}` }
        })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`WooCommerce API Error (Categories): ${response.status} - ${errorText}`)
        }
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
          if (error) {
            console.error('Supabase Upsert Error (Categories):', error)
            throw error
          }
          count = categories.length
          message = 'Categories synchronized successfully'
        } else {
          message = 'No categories found to synchronize'
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
