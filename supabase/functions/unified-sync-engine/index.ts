import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Invalid authentication token')

    const userId = user.id

    // Parse Body
    const body = await req.json().catch(() => ({}))
    const { action } = body
    if (!action) throw new Error('Missing action parameter')

    console.log(`Action: ${action} for User: ${userId}`)

    // Fetch Credentials
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('woo_url, woo_key, woo_secret, website_url, consumer_key, consumer_secret')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings) {
      throw new Error('WooCommerce settings not found. Please configure URL, Key and Secret.')
    }

    const { woo_url, woo_key, woo_secret, website_url, consumer_key, consumer_secret } = settings
    const actualUrl = (woo_url || website_url || '').trim().replace(/\/$/, '')
    const actualKey = (woo_key || consumer_key || '').trim()
    const actualSecret = (woo_secret || consumer_secret || '').trim()

    if (!actualUrl || !actualKey) {
      throw new Error('Incomplete WooCommerce settings.')
    }

    const auth = btoa(`${actualKey}:${actualSecret}`)
    const headers = { 'Authorization': `Basic ${auth}` }

    let count = 0
    let message = ''

    if (action === 'sync_orders') {
      const resp = await fetch(`${actualUrl}/wp-json/wc/v3/orders?per_page=50&status=any`, { headers })
      if (!resp.ok) throw new Error(`WooCommerce API Error (Orders): ${resp.status}`)
      const orders = await resp.json()
      if (Array.isArray(orders) && orders.length > 0) {
        const toUpsert = orders.map((o: any) => ({
          user_id: userId,
          order_id: o.id.toString(),
          customer_name: `${o.billing?.first_name || 'Guest'} ${o.billing?.last_name || ''}`.trim(),
          customer_phone: o.billing?.phone || '',
          customer_address: `${o.billing?.address_1 || ''}, ${o.billing?.city || ''}`.trim(),
          product_name: o.line_items?.[0]?.name || 'General',
          amount: parseFloat(o.total) || 0,
          status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
          product_category: 'WooCommerce',
          updated_at: new Date().toISOString()
        }))
        const { error } = await supabase.from('orders').upsert(toUpsert, { onConflict: 'user_id, order_id' })
        if (error) throw error
        count = orders.length
        message = `Successfully synced ${count} orders.`
      } else {
        message = 'No new orders found.'
      }
    } else if (action === 'sync_products') {
      const resp = await fetch(`${actualUrl}/wp-json/wc/v3/products?per_page=100`, { headers })
      if (!resp.ok) throw new Error(`WooCommerce API Error (Products): ${resp.status}`)
      const products = await resp.json()
      if (Array.isArray(products) && products.length > 0) {
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
        if (error) throw error
        count = products.length
        message = `Successfully synced ${count} products.`
      } else {
        message = 'No new products found.'
      }
    } else if (action === 'sync_categories') {
      const resp = await fetch(`${actualUrl}/wp-json/wc/v3/products/categories?per_page=100`, { headers })
      if (!resp.ok) throw new Error(`WooCommerce API Error (Categories): ${resp.status}`)
      const categories = await resp.json()
      if (Array.isArray(categories) && categories.length > 0) {
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
        message = `Successfully synced ${count} categories.`
      } else {
        message = 'No new categories found.'
      }
    } else {
      throw new Error(`Invalid action: ${action}`)
    }

    return new Response(JSON.stringify({ success: true, count, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Edge Function Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
