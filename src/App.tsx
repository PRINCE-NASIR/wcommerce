/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import { 
  Menu, 
  Search, 
  Bell, 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  ShoppingCart, 
  Users, 
  CheckSquare, 
  Wallet, 
  BarChart3, 
  Truck, 
  Layers, 
  Store, 
  BookOpen, 
  Settings, 
  ChevronDown, 
  Calendar, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  XSquare, 
  Warehouse, 
  PackageCheck,
  Heart,
  Edit,
  Save,
  Info,
  ExternalLink,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Key,
  LogIn,
  LogOut,
  AlertCircle,
  Trash2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Mock Data ---
const SALES_DATA_30: any[] = [];
const SALES_DATA_7: any[] = [];

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  hasDropdown = false, 
  active = false,
  isOpen = false,
  onClick,
  children
}: { 
  icon: any, 
  label: string, 
  hasDropdown?: boolean, 
  active?: boolean,
  isOpen?: boolean,
  onClick?: () => void,
  children?: React.ReactNode
}) => (
  <div className="flex flex-col gap-1">
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-200 rounded-lg text-sm font-medium",
        active ? "bg-slate-100 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={cn(active ? "text-blue-600" : "text-slate-400")} />
        <span>{label}</span>
      </div>
      {hasDropdown && (
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className={cn(active ? "text-blue-600" : "text-slate-300")} />
        </motion.div>
      )}
    </div>
    
    <AnimatePresence>
      {hasDropdown && isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-slate-50/50 rounded-lg ml-4"
        >
          <div className="py-1 flex flex-col gap-1 px-2 border-l border-slate-100 ml-3 mt-1 mb-2">
            {children || (
              <>
                <div className="text-xs text-slate-400 py-1.5 px-3 hover:text-blue-600 cursor-pointer transition-colors">All {label}</div>
                <div className="text-xs text-slate-400 py-1.5 px-3 hover:text-blue-600 cursor-pointer transition-colors">Add New</div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const StatsCard = ({ label, value, symbol = false, subtext, subtextColor }: { label: string, value: string | number, symbol?: boolean, subtext?: string, subtextColor?: string }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="w-full border-b border-dashed border-slate-100 my-2" />
      <div className="flex items-baseline gap-1">
        {symbol && <span className="text-xl font-bold text-slate-800">৳</span>}
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
      </div>
      {subtext && <p className={cn("text-[10px] font-bold mt-1", subtextColor)}>{subtext}</p>}
    </div>
  </div>
);

const StatusCard = ({ label, count, icon: Icon, colorClass, iconColor, active = false, onClick }: { label: string, count: number, icon: any, colorClass: string, iconColor: string, active?: boolean, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-95",
      active ? "ring-2 ring-blue-500 border-transparent bg-blue-50/30" : "border-slate-200"
    )}
  >
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-lg font-bold text-slate-800">{count}</span>
    </div>
    <div className={cn("p-2 rounded-lg", colorClass, active && "ring-2 ring-white")}>
      <Icon size={20} className={iconColor} />
    </div>
  </div>
);

const AnimatedCopyButton = ({ text, onCopy }: { text: string, onCopy?: () => void }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleCopy}
      className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-[120px] shadow-sm ${
        copied 
          ? 'bg-green-500 text-white shadow-green-200' 
          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
      }`}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="flex items-center gap-1"
          >
            <Check size={14} />
            <span>Copied!</span>
          </motion.div>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    }).catch(err => {
      console.error('Auth check failed:', err);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Reset state on logout
      if (!session) {
        setWooConfig({ url: '', key: '', secret: '', webhookSecret: '' });
        setWooStats({ totalSales: 0, orderCount: 0, avgOrderValue: 0 });
        setOrders([]);
        setProducts([]);
        setPurchases([]);
        setCustomers([]);
        setNotifications([]);
        setIsBackendConfigured(false);
        localStorage.clear(); // Important: Clear all cached data
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackendConfigured, setIsBackendConfigured] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [wooStats, setWooStats] = useState({
    totalSales: 0,
    orderCount: 0,
    avgOrderValue: 0
  });

  const [wooConfig, setWooConfig] = useState({
    url: '',
    key: '',
    secret: '',
    webhookSecret: ''
  });

  const [steadfastConfig, setSteadfastConfig] = useState({
    apiKey: '',
    secretKey: '',
    connected: false
  });

  const [businessDetails, setBusinessDetails] = useState({
    name: '',
    phone: '',
    website: ''
  });

  const [webhookSecret, setWebhookSecret] = useState('');

  const generateWebhookSecret = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setWebhookSecret(result);
  }, []);

  useEffect(() => {
    if (!webhookSecret) {
      generateWebhookSecret();
    }
  }, [webhookSecret, generateWebhookSecret]);

  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  // Auto-save settings to Supabase
  useEffect(() => {
    if (!session?.user || !supabase) return;
    
    const timer = setTimeout(async () => {
      if (wooConfig.url || wooConfig.key || wooConfig.secret || steadfastConfig.apiKey || steadfastConfig.secretKey) {
        await supabase
          .from('settings')
          .upsert({
            user_id: session.user.id,
            woo_url: wooConfig.url,
            woo_key: wooConfig.key,
            woo_secret: wooConfig.secret,
            webhook_secret: wooConfig.webhookSecret,
            steadfast_api_key: steadfastConfig.apiKey,
            steadfast_secret_key: steadfastConfig.secretKey,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [wooConfig, steadfastConfig, session, supabase]);

  // WooCommerce Status Mapper
  const mapWooStatus = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Approved';
      case 'on-hold': return 'Follow Up';
      case 'completed': return 'Update Status';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  const getWooCategories = useCallback(async () => {
    if (!wooConfig.url || !wooConfig.key || !wooConfig.secret) return;
    try {
      const response = await axios.get('/api/categories', {
        headers: {
          'x-woo-url': wooConfig.url,
          'x-woo-key': wooConfig.key,
          'x-woo-secret': wooConfig.secret
        }
      });
      if (response.data && Array.isArray(response.data)) {
        const mapped = response.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          count: c.count
        }));
        setCategories(mapped);
        mapped.forEach(cat => syncCategoryToSupabase(cat));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [wooConfig]);

  const getWooStats = useCallback(async () => {
    if (!wooConfig.url || !wooConfig.key || !wooConfig.secret) return;
    try {
      const response = await axios.get('/api/stats', {
        headers: {
          'x-woo-url': wooConfig.url,
          'x-woo-key': wooConfig.key,
          'x-woo-secret': wooConfig.secret
        }
      });
      if (response.data) {
        setWooStats({
          totalSales: response.data.totalSales,
          orderCount: response.data.orderCount,
          avgOrderValue: response.data.avgOrderValue
        });

        // Auto-Sync Stats to Supabase
        if (supabase && session?.user) {
          supabase.from('settings')
            .upsert({
              user_id: session.user.id,
              total_sales: response.data.totalSales,
              order_count: response.data.orderCount,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .then(({ error }) => {
              if (error) console.error('Auto-sync stats failed:', error);
            });
        }
        
        if (response.data.recentOrders && Array.isArray(response.data.recentOrders)) {
          const mappedOrders = response.data.recentOrders.map((o: any) => {
            const firstItem = o.line_items?.[0];
            const pId = firstItem ? `PRD${firstItem.product_id}` : null;
            
            // Try to find category from already loaded products
            const matchingProduct = products.find(p => p.id === pId);
            const category = matchingProduct?.category || 'General';

            return {
              id: `#ORD-${o.id}`,
              date: new Date(o.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              time: new Date(o.date_created).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              customer: `${o.billing.first_name} ${o.billing.last_name}`,
              phone: o.billing.phone,
              address: `${o.billing.city}, ${o.billing.state}`,
              productName: firstItem?.name || 'WooCommerce Order',
              productPrice: firstItem ? parseFloat(firstItem.price) : 0,
              deliveryCharge: parseFloat(o.shipping_total) || 0,
              category: category,
              amount: parseFloat(o.total) || 0,
              codAmount: o.payment_method === 'cod' ? parseFloat(o.total) : 0,
              status: mapWooStatus(o.status)
            };
          });
          setOrders(prev => {
            const combined = [...mappedOrders];
            prev.forEach(p => {
              if (!combined.find(c => c.id === p.id)) {
                combined.push(p);
              }
            });
            return combined;
          });
          
          // Auto-Sync each order
          mappedOrders.forEach(order => syncOrderToSupabase(order));
        }
        
        setIsBackendConfigured(true);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setIsBackendConfigured(false);
      } else {
        console.error('Failed to fetch stats:', error);
      }
    }
  }, [wooConfig]);

  const getWooProducts = useCallback(async () => {
    if (!wooConfig.url || !wooConfig.key || !wooConfig.secret) return;
    try {
      const response = await axios.get('/api/products', {
        headers: {
          'x-woo-url': wooConfig.url,
          'x-woo-key': wooConfig.key,
          'x-woo-secret': wooConfig.secret
        }
      });
      if (response.data && Array.isArray(response.data)) {
        const mappedProducts = response.data.map((p: any) => ({
          id: `PRD${p.id}`,
          name: p.name,
          category: p.categories?.[0]?.name || 'General',
          price: parseFloat(p.price) || 0,
          stock: p.stock_quantity || 0,
          status: (p.stock_quantity || 0) > 10 ? 'In Stock' : (p.stock_quantity || 0) > 0 ? 'Low Stock' : 'Out of Stock'
        }));
        setProducts(prev => {
          const combined = [...mappedProducts];
          prev.forEach(p => {
            if (!combined.find(c => c.id === p.id)) {
              combined.push(p);
            }
          });
          return combined;
        });

        // Auto-Sync each product
        mappedProducts.forEach(product => syncProductToSupabase(product));
        
        setIsBackendConfigured(true);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setIsBackendConfigured(false);
      } else {
        console.error('Failed to fetch products:', error);
      }
    }
  }, [wooConfig]);

  // Consolidated settings and data loading
  useEffect(() => {
    if (session?.user && supabase) {
      const initializeData = async () => {
        try {
          // Load settings and stats
          const { data: settingsData, error: settingsError } = await supabase
            .from('settings')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (settingsError) throw settingsError;

          if (settingsData) {
            // Map settings (handling potential column naming differences)
            setWooConfig({
              url: settingsData.woo_url || '',
              key: settingsData.woo_key || settingsData.key || '',
              secret: settingsData.woo_secret || '',
              webhookSecret: settingsData.webhook_secret || ''
            });

            setBusinessDetails({
              name: settingsData.business_name || '',
              phone: settingsData.business_phone || '',
              website: settingsData.business_website || ''
            });

            setSteadfastConfig({
              apiKey: settingsData.steadfast_api_key || '',
              secretKey: settingsData.steadfast_secret_key || '',
              connected: !!(settingsData.steadfast_api_key && settingsData.steadfast_secret_key)
            });

            if (settingsData.total_sales !== undefined) {
              setWooStats(prev => ({
                ...prev,
                totalSales: settingsData.total_sales || 0,
                orderCount: settingsData.order_count || 0,
                avgOrderValue: settingsData.order_count > 0 ? settingsData.total_sales / settingsData.order_count : 0
              }));
            }
          }

          // Load synced entities
          const [ordersRes, productsRes, customersRes] = await Promise.all([
            supabase.from('orders').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(100),
            supabase.from('products').select('*').eq('user_id', session.user.id).limit(100),
            supabase.from('customers').select('*').eq('user_id', session.user.id).limit(100)
          ]);

          if (productsRes.data) {
            const mappedP = productsRes.data.map(p => ({
              id: p.product_id,
              name: p.name,
              price: p.price,
              stock: p.stock,
              category: p.category || 'General',
              status: p.status || 'Active'
            }));
            setProducts(mappedP);
          }

          if (ordersRes.data) {
            setOrders(ordersRes.data.map(o => ({
              id: o.order_id,
              customer: o.customer_name,
              phone: o.customer_phone,
              address: o.customer_address,
              productName: o.product_name,
              category: o.product_category || 'General',
              productPrice: o.product_price,
              deliveryCharge: o.delivery_charge,
              amount: o.amount,
              codAmount: o.cod_amount,
              status: o.status,
              date: o.order_date || new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              time: o.order_time || 'Cloud'
            })));
          }

          if (customersRes.data) {
            setCustomers(customersRes.data.map(c => ({
              id: c.customer_id,
              name: c.name,
              phone: c.phone,
              address: c.address,
              totalOrders: c.total_orders,
              totalSpent: c.total_spent
            })));
          }
        } catch (err) {
          console.error('Error initializing data from Supabase:', err);
        }
      };

      initializeData();
    } else if (!session) {
      // Clear state when no session
      setWooConfig({ url: '', key: '', secret: '', webhookSecret: '' });
      setBusinessDetails({ name: '', phone: '', website: '' });
      setOrders([]);
      setProducts([]);
      setCustomers([]);
      setWooStats({ totalSales: 0, orderCount: 0, avgOrderValue: 0 });
    }
  }, [session, supabase]);

  // Handle data fetching when config changes
  useEffect(() => {
    if (wooConfig.url && wooConfig.key && wooConfig.secret) {
      getWooStats();
      getWooProducts();
    }
  }, [wooConfig, getWooStats, getWooProducts]);

  const saveAccountSettings = async () => {
    setIsConfigSaving(true);
    setConfigError(null);
    try {
      if (!supabase) throw new Error('Database not connected');
      if (!session?.user) throw new Error('Not authenticated');

      const { error: dbError } = await supabase
        .from('settings')
        .upsert({
          user_id: session.user.id,
          woo_url: wooConfig.url,
          woo_key: wooConfig.key,
          woo_secret: wooConfig.secret,
          webhook_secret: wooConfig.webhookSecret,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (dbError) {
        console.error('Supabase save error:', dbError);
        let errorMsg = dbError.message;
        if (errorMsg.includes('column') && errorMsg.includes('not found')) {
          errorMsg = "Database columns missing. Please run the SQL command provided in the chat to add 'business_name', 'business_phone', and 'business_website' to your settings table.";
        }
        throw new Error(errorMsg);
      }
      
      setNotifications([
        {
          id: Date.now(),
          title: 'Success',
          message: 'Saved successfully',
          time: 'Just now',
          read: false
        },
        ...notifications
      ]);

      if (wooConfig.url && wooConfig.key && wooConfig.secret) {
        getWooStats();
        getWooProducts();
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setConfigError(error.message || 'Failed to update configuration');
      setNotifications([
        {
          id: Date.now(),
          title: 'Save Error',
          message: error.message,
          time: 'Just now',
          read: false
        },
        ...notifications
      ]);
    } finally {
      setIsConfigSaving(false);
    }
  };


  // Real-time Socket Connection
  useEffect(() => {
    const socket = io();
    
    socket.on('order_updated', (payload) => {
      console.log('Real-time order update received:', payload);
      
      const orderAmount = parseFloat(payload.total);
      
      // Update Stats in real-time
      setWooStats(prev => {
        const newCount = prev.orderCount + 1;
        const newTotal = prev.totalSales + orderAmount;
        return {
          orderCount: newCount,
          totalSales: newTotal,
          avgOrderValue: newTotal / newCount
        };
      });

      const newOrder = {
        id: `#ORD-${payload.id}`,
        date: new Date(payload.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date(payload.date_created).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        customer: `${payload.billing.first_name} ${payload.billing.last_name}`,
        phone: payload.billing.phone,
        address: `${payload.billing.city}, ${payload.billing.state}`,
        productName: payload.line_items?.[0]?.name || 'WooCommerce Order',
        amount: orderAmount,
        status: mapWooStatus(payload.status)
      };

      syncOrderToSupabase(newOrder);
      
      // Update Stats in real-time
      setWooStats(prev => {
        const newCount = prev.orderCount + 1;
        const newTotal = prev.totalSales + orderAmount;
        syncStatsToSupabase(newTotal, newCount);
        return {
          orderCount: newCount,
          totalSales: newTotal,
          avgOrderValue: newTotal / newCount
        };
      });

      setOrders(prev => {
        // Prevent duplicates
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });

      setNotifications(prev => [
        {
          id: Date.now(),
          title: 'WooCommerce Order Received',
          message: `New order ${newOrder.id} from ${newOrder.customer}`,
          time: 'Just now',
          read: false,
          orderId: newOrder.id
        },
        ...prev
      ]);
    });

    getWooProducts();
    getWooStats();

    return () => {
      socket.disconnect();
    };
  }, [getWooProducts, getWooStats]);

  // Supabase Real-time Subscription
  useEffect(() => {
    if (!supabase || !session?.user) return;

    const ordersChannel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Supabase order change received:', payload);
          if (payload.eventType === 'INSERT') {
            const newOrder = {
              id: payload.new.order_id,
              customer: payload.new.customer_name,
              phone: payload.new.customer_phone,
              address: payload.new.customer_address,
              productName: payload.new.product_name,
              productPrice: payload.new.product_price,
              deliveryCharge: payload.new.delivery_charge,
              amount: payload.new.amount,
              codAmount: payload.new.cod_amount,
              status: payload.new.status,
              date: payload.new.order_date || new Date(payload.new.created_at).toLocaleDateString(),
              time: payload.new.order_time || 'Cloud'
            };
            setOrders(prev => {
              if (prev.find(o => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => 
              o.id === payload.new.order_id ? {
                ...o,
                status: payload.new.status,
                amount: payload.new.amount,
                customer: payload.new.customer_name
              } : o
            ));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.order_id));
          }
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Supabase product change received:', payload);
          if (payload.eventType === 'INSERT') {
            const newProduct = {
              id: payload.new.product_id,
              name: payload.new.name,
              price: payload.new.price,
              stock: payload.new.stock,
              category: payload.new.category,
              status: payload.new.status
            };
            setProducts(prev => {
              if (prev.find(p => p.id === newProduct.id)) return prev;
              return [newProduct, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setProducts(prev => prev.map(p => 
              p.id === payload.new.product_id ? {
                ...p,
                name: payload.new.name,
                price: payload.new.price,
                stock: payload.new.stock,
                status: payload.new.status
              } : p
            ));
          } else if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== payload.old.product_id));
          }
        }
      )
      .subscribe();

    const customersChannel = supabase
      .channel('public:customers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Supabase customer change received:', payload);
          if (payload.eventType === 'INSERT') {
            const newCustomer = {
              id: payload.new.customer_id,
              name: payload.new.name,
              phone: payload.new.phone,
              address: payload.new.address,
              totalOrders: payload.new.total_orders,
              totalSpent: payload.new.total_spent
            };
            setCustomers(prev => {
              if (prev.find(c => c.id === newCustomer.id)) return prev;
              return [newCustomer, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setCustomers(prev => prev.map(c => 
              c.id === payload.new.customer_id ? {
                ...c,
                name: payload.new.name,
                phone: payload.new.phone,
                address: payload.new.address,
                totalOrders: payload.new.total_orders,
                totalSpent: payload.new.total_spent
              } : c
            ));
          } else if (payload.eventType === 'DELETE') {
            setCustomers(prev => prev.filter(c => c.id !== payload.old.customer_id));
          }
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('public:categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Supabase category change received:', payload);
          if (payload.eventType === 'INSERT') {
            const newCategory = {
              id: payload.new.category_id,
              name: payload.new.name,
              description: payload.new.description,
              count: payload.new.count
            };
            setCategories(prev => {
              if (prev.find(c => c.id === newCategory.id)) return prev;
              return [newCategory, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setCategories(prev => prev.map(c => 
              c.id === payload.new.category_id ? {
                ...c,
                name: payload.new.name,
                description: payload.new.description,
                count: payload.new.count
              } : c
            ));
          } else if (payload.eventType === 'DELETE') {
            setCategories(prev => prev.filter(c => c.id !== payload.old.category_id));
          }
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel('public:settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            if (payload.new.business_name || payload.new.business_phone || payload.new.business_website) {
              setBusinessDetails({
                name: payload.new.business_name || '',
                phone: payload.new.business_phone || '',
                website: payload.new.business_website || ''
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [session, supabase]);

  const [notifications, setNotifications] = useState<{id: number, title: string, message: string, time: string, read: boolean, orderId?: string}[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);

  // Function to add a toast
  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    const newToast = { id, title, message, type };
    setToasts(prev => [newToast, ...prev].slice(0, 3)); // Show max 3 at a time
    
    // Add to general notifications as well
    setNotifications(prev => [{
      id,
      title,
      message,
      time: 'Just now',
      read: false,
      type
    }, ...prev]);

    // Auto remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // New States for Functionality
  const [currentView, setCurrentView] = useState<'dashboard' | 'orders' | 'products' | 'purchases' | 'customers' | 'settings' | 'profile' | 'sync' | 'steadfast'>('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Supabase Data Persistence Functions
  const syncOrderToSupabase = async (order: any) => {
    if (!supabase || !session?.user) {
      console.warn('Sync ignored: Supabase or Session missing');
      return;
    }
    try {
      console.log('Syncing order to Supabase:', order.id);
      const { error } = await supabase.from('orders').upsert({
        user_id: session.user.id,
        order_id: order.id,
        customer_name: order.customer,
        customer_phone: order.phone,
        customer_address: order.address,
        product_name: order.productName,
        product_category: order.category,
        product_price: order.productPrice,
        delivery_charge: order.deliveryCharge,
        amount: order.amount,
        cod_amount: order.codAmount,
        status: order.status,
        order_date: order.date,
        order_time: order.time,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, order_id' });

      if (error) {
        console.error('Supabase Order Sync Error:', error);
      } else {
        console.log('Order synced successfully:', order.id);
      }
    } catch (error) {
      console.error('Failed to sync order to Supabase (catch):', error);
    }
  };

  const syncProductToSupabase = async (product: any) => {
    if (!supabase || !session?.user) return;
    try {
      console.log('Syncing product to Supabase:', product.id);
      const { error } = await supabase.from('products').upsert({
        user_id: session.user.id,
        product_id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category,
        status: product.status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, product_id' });

      if (error) {
        console.error('Supabase Product Sync Error:', error);
      } else {
        console.log('Product synced successfully:', product.id);
      }
    } catch (error) {
      console.error('Failed to sync product to Supabase (catch):', error);
    }
  };

  const syncCustomerToSupabase = async (customer: any) => {
    if (!supabase || !session?.user) return;
    try {
      console.log('Syncing customer to Supabase:', customer.id);
      const { error } = await supabase.from('customers').upsert({
        user_id: session.user.id,
        customer_id: customer.id,
        name: customer.name || 'New Customer',
        phone: customer.phone,
        address: customer.address,
        total_orders: customer.totalOrders || 0,
        total_spent: customer.totalSpent || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, customer_id' });

      if (error) {
        console.error('Supabase Customer Sync Error:', error);
      } else {
        console.log('Customer synced successfully:', customer.id);
      }
    } catch (error) {
      console.error('Failed to sync customer to Supabase (catch):', error);
    }
  };

  const syncCategoryToSupabase = async (category: any) => {
    if (!supabase || !session?.user) return;
    try {
      const { error } = await supabase.from('categories').upsert({
        user_id: session.user.id,
        category_id: category.id,
        name: category.name,
        description: category.description || '',
        count: category.count || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, category_id' });

      if (error) console.error('Supabase Category Sync Error:', error);
    } catch (error) {
      console.error('Failed to sync category (catch):', error);
    }
  };

  const syncStatsToSupabase = async (sales: number, count: number) => {
    if (!supabase || !session?.user) return;
    try {
      await supabase.from('settings').upsert({
        user_id: session.user.id,
        total_sales: sales,
        order_count: count,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Failed to sync stats to Supabase:', error);
    }
  };
  
  // Clear localStorage once on mount if we want to "flush" it (optional, but requested "fresh" app)
  useEffect(() => {
    localStorage.removeItem('orders');
    localStorage.removeItem('products');
    localStorage.removeItem('purchases');
    localStorage.removeItem('customers');
  }, []);
  
  const [isAddNewModalOpen, setIsAddNewModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
  const [syncLogs, setSyncLogs] = useState<Record<string, string>>({});
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<any>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<any>(null);
  const [editOrderData, setEditOrderData] = useState<any>(null);
  
  const [newOrderData, setNewOrderData] = useState({ 
    customer: '', 
    phone: '',
    address: '',
    productName: '',
    productPrice: '',
    deliveryCharge: '',
    codAmount: ''
  });

  const [newProductData, setNewProductData] = useState({
    name: '',
    category: '',
    price: '',
    stock: ''
  });

  const [newPurchaseData, setNewPurchaseData] = useState({
    supplier: '',
    items: '',
    amount: ''
  });

  const [editProductData, setEditProductData] = useState<any>(null);

  useEffect(() => {
    setPendingStatus(null);
    setIsStatusMenuOpen(false);
  }, [selectedOrder]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

  const [newCustomerData, setNewCustomerData] = useState({ 
    name: '', 
    phone: '', 
    address: '',
    productName: '',
    price: '',
    deliveryCharge: '',
    codAmount: ''
  });

  const [timeRange, setTimeRange] = useState<'7' | '30'>('30');
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);

  const userInitials = useMemo(() => {
    if (!session?.user) return '??';
    const email = session.user.email || '';
    const name = session.user.user_metadata?.full_name || email.split('@')[0];
    if (name.includes(' ')) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
    }
    return name.substring(0, 2).toUpperCase();
  }, [session]);

  const userDisplayName = useMemo(() => {
    if (businessDetails.name) return businessDetails.name;
    if (!session?.user) return 'Guest';
    return session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
  }, [session, businessDetails.name]);

  const chartData = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const days = timeRange === '7' ? 7 : 30;
    const dataMap: Record<string, number> = {};
    
    // Initialize last N days with zero sales
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[ds] = 0;
    }

    // Sum order amounts by date
    orders.forEach(o => {
      const od = new Date(o.date);
      if (!isNaN(od.getTime())) {
        const ds = od.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dataMap[ds] !== undefined) {
          dataMap[ds] += (o.amount || 0);
        }
      }
    });

    return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
  }, [orders, timeRange]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newCustomerData.price) || 0;
    const deliveryCharge = parseFloat(newCustomerData.deliveryCharge) || 0;
    const totalAmount = price + deliveryCharge;
    const codAmount = parseFloat(newCustomerData.codAmount) || totalAmount;

    const newId = `CUS${String(customers.length + 1).padStart(3, '0')}`;
    const newCustomer = {
      id: newId,
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      address: newCustomerData.address,
      totalOrders: 1,
      totalSpent: totalAmount
    };

    // Create an order for this customer immediately
    const newOrderId = `#ORD${Math.floor(Math.random() * 1000) + 800}`;
    const newOrder = {
      id: newOrderId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      customer: newCustomerData.name,
      phone: newCustomerData.phone,
      address: newCustomerData.address,
      productName: newCustomerData.productName,
      productPrice: price,
      deliveryCharge: deliveryCharge,
      amount: totalAmount,
      codAmount: codAmount,
      status: 'Pending'
    };

    setCustomers([newCustomer, ...customers]);
    syncCustomerToSupabase(newCustomer);
    setOrders([newOrder, ...orders]);
    syncOrderToSupabase(newOrder);

    // Update global stats
    const newSales = wooStats.totalSales + totalAmount;
    const newCount = wooStats.orderCount + 1;
    setWooStats(prev => ({
      ...prev,
      totalSales: newSales,
      orderCount: newCount,
      avgOrderValue: newCount > 0 ? newSales / newCount : 0
    }));
    syncStatsToSupabase(newSales, newCount);
    setNotifications([
      {
        id: Date.now(),
        title: 'New Order Received',
        message: `Order ${newOrderId} created for new customer ${newCustomerData.name}`,
        time: 'Just now',
        read: false,
        orderId: newOrderId
      },
      ...notifications
    ]);
    setIsCustomerModalOpen(false);
    setNewCustomerData({ 
      name: '', 
      phone: '', 
      address: '', 
      productName: '', 
      price: '', 
      deliveryCharge: '',
      codAmount: '' 
    });
    setStatusFilter(null);
    setSearchQuery('');
    setCurrentView('orders');
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    
    setOrders(prev => prev.filter(o => o.id !== orderId));
    
    try {
      if (supabase && session?.user) {
        await supabase.from('orders').delete().eq('user_id', session.user.id).eq('order_id', orderId);
      }
      setNotifications([
        {
          id: Date.now(),
          title: 'Order Deleted',
          message: `Order ${orderId} has been removed.`,
          time: 'Just now',
          read: false
        },
        ...notifications
      ]);
    } catch (error) {
      console.error('Failed to delete order from Supabase:', error);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    
    try {
      if (supabase && session?.user) {
        await supabase.from('customers').delete().eq('user_id', session.user.id).eq('customer_id', customerId);
      }
    } catch (error) {
      console.error('Failed to delete customer from Supabase:', error);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  
  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const handleRefresh = async () => {
    if (!wooConfig.url || !wooConfig.key || !wooConfig.secret || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Call the Supabase Edge Function to handle sync server-side
      let syncError = null;
      try {
        const { data, error } = await supabase.functions.invoke('woocommerce-sync', {
          body: { 
            wooUrl: wooConfig.url, 
            wooKey: wooConfig.key, 
            wooSecret: wooConfig.secret,
            syncType: 'all' // Sync everything via server
          }
        });
        syncError = error;
        if (!error) console.log('Successfully synced via Edge Function:', data);
      } catch (err) {
        syncError = err;
      }

      if (syncError) {
        console.warn('Edge Function sync failed or not reachable, falling back to local sync:', syncError);
        // Fallback to client-side sync if function isn't deployed or reachable
        await Promise.all([
          getWooProducts(),
          getWooStats(),
          getWooCategories()
        ]);
      } 

      setNotifications([{
        id: Date.now(),
        title: 'Sync Engine',
        message: 'All WooCommerce data synchronized via Edge Function.',
        time: 'Just now',
        read: false
      }, ...notifications]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProductForEdit(product);
    setEditProductData({ ...product });
  };

  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProducts = products.map(p => 
      p.id === selectedProductForEdit.id ? {
        ...editProductData,
        price: parseFloat(editProductData.price) || 0,
        stock: parseInt(editProductData.stock) || 0,
        status: parseInt(editProductData.stock) > 10 ? 'In Stock' : parseInt(editProductData.stock) > 0 ? 'Low Stock' : 'Out of Stock'
      } : p
    );
    setProducts(updatedProducts);
    setSelectedProductForEdit(null);
    setEditProductData(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    // Optimistic update
    const previousProducts = [...products];
    setProducts(products.filter(p => p.id !== productId));

    try {
      if (supabase && session?.user) {
        await supabase.from('products').delete().eq('user_id', session.user.id).eq('product_id', productId);
      }
      
      if (isBackendConfigured) {
        await axios.delete(`/api/products/${productId}`, {
          headers: {
            'x-woo-url': wooConfig.url,
            'x-woo-key': wooConfig.key,
            'x-woo-secret': wooConfig.secret
          }
        });
      }
      setNotifications([
        {
          id: Date.now(),
          title: 'Product Removed',
          message: `Product ${productId} has been deleted successfully.`,
          time: 'Just now',
          read: false
        },
        ...notifications
      ]);
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product from WooCommerce. It might be local only or server is down.');
      setProducts(previousProducts);
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (notif.orderId) {
      const order = orders.find(o => o.id === notif.orderId);
      if (order) {
        setSelectedOrder(order);
        setIsNotificationsOpen(false);
      }
    }
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    
    const printContent = `
      <html>
        <head>
          <title>Invoice - ${selectedOrder.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; }
            .invoice-title { font-size: 20px; font-weight: bold; color: #64748b; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .detail-box h3 { font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 8px; font-weight: 800; }
            .detail-box p { font-size: 14px; font-weight: bold; margin: 0; }
            .detail-box .subtext { font-weight: normal; color: #64748b; font-size: 12px; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-align: left; background: #f8fafc; padding: 12px; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .footer { display: flex; flex-direction: column; align-items: flex-end; }
            .total-row { display: flex; width: 250px; justify-content: space-between; padding: 8px 0; font-size: 13px; }
            .grand-total { border-top: 2px solid #1e293b; margin-top: 10px; padding-top: 15px; font-size: 16px; font-weight: 900; color: #000; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">WooCommerce</div>
            <div class="invoice-title">INVOICE ${selectedOrder.id}</div>
          </div>
          <div class="details">
            <div class="detail-box">
              <h3>Customer Details</h3>
              <p>${selectedOrder.customer}</p>
              <div class="subtext">${selectedOrder.phone || ''}</div>
              <div class="subtext">${selectedOrder.address || ''}</div>
            </div>
            <div class="detail-box text-right">
              <h3>Order Info</h3>
              <p>${selectedOrder.date}</p>
              <div class="subtext">${selectedOrder.time || ''}</div>
              <div class="subtext">Status: ${selectedOrder.status}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product Description</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${selectedOrder.productName || selectedOrder.product || 'General Item'}</td>
                <td class="text-right">৳${selectedOrder.amount || selectedOrder.price || 0}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <div class="total-row">
              <span>Product Total</span>
              <span>৳${selectedOrder.productPrice || selectedOrder.amount || selectedOrder.price || 0}</span>
            </div>
            ${selectedOrder.deliveryCharge ? `
            <div class="total-row">
              <span>Delivery Charge</span>
              <span>৳${selectedOrder.deliveryCharge}</span>
            </div>
            ` : ''}
            <div class="total-row" style="border-top: 1px dashed #f1f5f9; margin-top: 5px; padding-top: 10px;">
              <span>Bill Amount</span>
              <span>৳${selectedOrder.amount || (parseFloat(selectedOrder.productPrice || 0) + parseFloat(selectedOrder.deliveryCharge || 0)) || selectedOrder.price || 0}</span>
            </div>
            <div class="total-row grand-total">
              <span>COD Amount</span>
              <span>৳${selectedOrder.codAmount || selectedOrder.amount || selectedOrder.price || 0}</span>
            </div>
          </div>
          <div style="margin-top: 80px; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">
            Thank you for shopping with WooCommerce
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            }
          </script>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrderForEdit(order);
    setEditOrderData({
      ...order,
      productPrice: order.productPrice || order.amount || 0,
      deliveryCharge: order.deliveryCharge || 0,
    });
  };

  const handleSaveOrderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const productPrice = parseFloat(editOrderData.productPrice) || 0;
    const deliveryCharge = parseFloat(editOrderData.deliveryCharge) || 0;
    const totalAmount = productPrice + deliveryCharge;

    const updatedOrders = orders.map(o => 
      o.id === selectedOrderForEdit.id ? {
        ...editOrderData,
        amount: totalAmount,
        codAmount: parseFloat(editOrderData.codAmount) || totalAmount,
        productPrice,
        deliveryCharge
      } : o
    );
    
    setOrders(updatedOrders);
    
    // Auto-sync edit to Supabase
    const updatedOrder = updatedOrders.find(o => o.id === selectedOrderForEdit.id);
    if (updatedOrder) {
      syncOrderToSupabase(updatedOrder);
      
      // Update stats if amount changed
      const diff = totalAmount - (selectedOrderForEdit.amount || 0);
      if (diff !== 0) {
        const newSales = wooStats.totalSales + diff;
        setWooStats(prev => ({
          ...prev,
          totalSales: newSales,
          avgOrderValue: prev.orderCount > 0 ? newSales / prev.orderCount : 0
        }));
        syncStatsToSupabase(newSales, wooStats.orderCount);
      }
    }

    setSelectedOrderForEdit(null);
    setEditOrderData(null);
    if (selectedOrder?.id === selectedOrderForEdit.id) {
       setSelectedOrder(updatedOrders.find(o => o.id === selectedOrderForEdit.id));
    }
  };

  const handleStatusSelect = (newStatus: string) => {
    setPendingStatus(newStatus);
    setIsStatusMenuOpen(false);
  };

  const handleSaveStatus = () => {
    if (!selectedOrder || !pendingStatus) return;
    
    const newStatus = pendingStatus;
    const updatedOrder = { ...selectedOrder, status: newStatus };
    
    setOrders(prevOrders => prevOrders.map(o => 
      o.id === selectedOrder.id ? { ...o, status: newStatus } : o
    ));
    
    setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    setPendingStatus(null);
    
    // Auto-sync status change to Supabase
    syncOrderToSupabase(updatedOrder);
    
    // Quick refresh animation to show it's saved
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const productPrice = parseFloat(newOrderData.productPrice) || 0;
    const deliveryCharge = parseFloat(newOrderData.deliveryCharge) || 0;
    const totalAmount = productPrice + deliveryCharge;

    const newOrder = {
      id: `#ORD${848 + orders.length + 1}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      customer: newOrderData.customer || 'New Customer',
      phone: newOrderData.phone,
      address: newOrderData.address,
      productName: newOrderData.productName,
      productPrice: productPrice,
      deliveryCharge: deliveryCharge,
      amount: totalAmount,
      codAmount: parseFloat(newOrderData.codAmount) || totalAmount,
      status: 'Pending'
    };
    setOrders([newOrder, ...orders]);
    syncOrderToSupabase(newOrder);
    
    const newSales = wooStats.totalSales + totalAmount;
    const newCount = wooStats.orderCount + 1;
    setWooStats(prev => ({
      ...prev,
      totalSales: newSales,
      orderCount: newCount,
      avgOrderValue: newCount > 0 ? newSales / newCount : 0
    }));
    syncStatsToSupabase(newSales, newCount);
    setNotifications([
      {
        id: Date.now(),
        title: 'New Order Received',
        message: `New order ${newOrder.id} for ${newOrder.customer} has been placed.`,
        time: 'Just now',
        read: false,
        orderId: newOrder.id
      },
      ...notifications
    ]);
    setIsAddNewModalOpen(false);
    setNewOrderData({ 
      customer: '', 
      phone: '', 
      address: '', 
      productName: '', 
      productPrice: '', 
      deliveryCharge: '', 
      codAmount: '' 
    });
    setStatusFilter(null);
    setSearchQuery('');
    setCurrentView('orders');
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newProductData.price) || 0;
    const stock = parseInt(newProductData.stock) || 0;
    
    const newProduct = {
      id: `PRD${String(products.length + 1).padStart(3, '0')}`,
      name: newProductData.name || 'Untitled Product',
      category: newProductData.category || 'General',
      price: price,
      stock: stock,
      status: stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock'
    };
    
    setProducts([newProduct, ...products]);
    syncProductToSupabase(newProduct);
    setIsProductModalOpen(false);
    setNewProductData({ name: '', category: '', price: '', stock: '' });
    setCurrentView('products');
  };

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newPurchaseData.amount) || 0;
    
    const newPurchase = {
      id: `PUR${String(purchases.length + 1).padStart(3, '0')}`,
      supplier: newPurchaseData.supplier || 'Unknown Supplier',
      items: newPurchaseData.items || 'General Items',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: amount,
      status: 'Pending'
    };
    
    setPurchases([newPurchase, ...purchases]);
    setIsPurchaseModalOpen(false);
    setNewPurchaseData({ supplier: '', items: '', amount: '' });
    setCurrentView('purchases');
  };

  const filteredOrders = orders.filter(order => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (order.id || '').toLowerCase().includes(q) ||
      (order.customer || '').toLowerCase().includes(q) ||
      (order.phone || '').toLowerCase().includes(q);
    
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  const q = searchQuery.toLowerCase();

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q) ||
    (p.id || '').toLowerCase().includes(q)
  );

  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(q) ||
    (c.phone || '').toLowerCase().includes(q) ||
    (c.id || '').toLowerCase().includes(q)
  );

  const filteredPurchases = purchases.filter(p => 
    (p.supplier || '').toLowerCase().includes(q) ||
    (p.items || '').toLowerCase().includes(q) ||
    (p.id || '').toLowerCase().includes(q)
  );

  const handleLogout = async () => {
    if (supabase) {
      localStorage.clear();
      await supabase.auth.signOut();
    }
  };

  const handleManualSync = async (type: 'orders' | 'products' | 'categories') => {
    setIsSyncing(prev => ({ ...prev, [type]: true }));
    setSyncLogs(prev => ({ ...prev, [type]: 'Initializing sync...' }));
    
    try {
      if (type === 'products') {
        await getWooProducts();
      } else if (type === 'orders') {
        await getWooStats();
      }
      setSyncLogs(prev => ({ ...prev, [type]: `Last synced: ${new Date().toLocaleString()}` }));
    } catch (error: any) {
      setSyncLogs(prev => ({ ...prev, [type]: `Error: ${error.message}` }));
    } finally {
      setIsSyncing(prev => ({ ...prev, [type]: false }));
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div key={session.user.id} className="min-h-screen bg-brand-bg flex flex-col">
      {/* Error Banners */}
      <AnimatePresence>
        {aiError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500 text-white text-[10px] font-bold text-center py-2 px-4 uppercase tracking-[0.2em] relative z-[200]"
          >
            {aiError}
            <button onClick={() => setAiError(null)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New Order Modal */}
      <AnimatePresence>
        {isAddNewModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddNewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.form 
              onSubmit={handleAddOrder}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">New Order Booking</h3>
                  <p className="text-xs text-slate-400 font-medium">Fill in the customer and product details</p>
                </div>
                <button type="button" onClick={() => setIsAddNewModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                  <XSquare size={20} />
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto scrollbar-none">
                {/* Customer Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <Users size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Information</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Customer Name</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
                      value={newOrderData.customer}
                      onChange={e => setNewOrderData({...newOrderData, customer: e.target.value})}
                      placeholder="Customer Name"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      value={newOrderData.phone}
                      onChange={e => setNewOrderData({...newOrderData, phone: e.target.value})}
                      placeholder="Phone"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Address</label>
                    <textarea 
                      required
                      rows={3}
                      value={newOrderData.address}
                      onChange={e => setNewOrderData({...newOrderData, address: e.target.value})}
                      placeholder="House, Road, Area, City..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Product Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <ShoppingBag size={16} className="text-orange-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product & Payment</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Product Detail</label>
                    <input 
                      required
                      type="text" 
                      value={newOrderData.productName}
                      onChange={e => setNewOrderData({...newOrderData, productName: e.target.value})}
                      placeholder="Item name, size, color..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Product Price</label>
                      <input 
                        required
                        type="number" 
                        value={newOrderData.productPrice}
                        onChange={e => setNewOrderData({...newOrderData, productPrice: e.target.value})}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Del. Charge</label>
                      <input 
                        required
                        type="number" 
                        value={newOrderData.deliveryCharge}
                        onChange={e => setNewOrderData({...newOrderData, deliveryCharge: e.target.value})}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Cash on Delivery (COD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-slate-400 font-bold">৳</span>
                      <input 
                        type="number" 
                        value={newOrderData.codAmount}
                        onChange={e => setNewOrderData({...newOrderData, codAmount: e.target.value})}
                        placeholder="Total amount to collect"
                        className="w-full pl-8 pr-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm text-blue-700"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 font-medium italic">* Leave blank to use (Price + Delivery)</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 flex gap-3 border-t border-slate-100">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]">Confirm Booking</button>
                <button type="button" onClick={() => setIsAddNewModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-all active:scale-[0.98]">Cancel</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Product Modal */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.form 
              onSubmit={handleAddProduct}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Add New Product</h3>
                </div>
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                  <XSquare size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Product Name</label>
                  <input 
                    required
                    type="text" 
                    value={newProductData.name}
                    onChange={e => setNewProductData({...newProductData, name: e.target.value})}
                    placeholder="e.g. Silk Panjabi"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Category</label>
                  <input 
                    type="text" 
                    value={newProductData.category}
                    onChange={e => setNewProductData({...newProductData, category: e.target.value})}
                    placeholder="e.g. Clothing"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Selling Price</label>
                    <input 
                      required
                      type="number" 
                      value={newProductData.price}
                      onChange={e => setNewProductData({...newProductData, price: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Initial Stock</label>
                    <input 
                      required
                      type="number" 
                      value={newProductData.stock}
                      onChange={e => setNewProductData({...newProductData, stock: e.target.value})}
                      placeholder="0"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all">Save Product</button>
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
      
      {/* Add New Purchase Modal */}
      <AnimatePresence>
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPurchaseModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.form 
              onSubmit={handleAddPurchase}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">New Purchase Record</h3>
                </div>
                <button type="button" onClick={() => setIsPurchaseModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                  <XSquare size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Supplier Name</label>
                  <input 
                    required
                    type="text" 
                    value={newPurchaseData.supplier}
                    onChange={e => setNewPurchaseData({...newPurchaseData, supplier: e.target.value})}
                    placeholder="e.g. Star Tech"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Items Detail</label>
                  <textarea 
                    required
                    rows={2}
                    value={newPurchaseData.items}
                    onChange={e => setNewPurchaseData({...newPurchaseData, items: e.target.value})}
                    placeholder="What did you buy?"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Total Cost (৳)</label>
                  <input 
                    required
                    type="number" 
                    value={newPurchaseData.amount}
                    onChange={e => setNewPurchaseData({...newPurchaseData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="bg-slate-50 p-6 flex gap-3">
                <button type="submit" className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-all">Record Purchase</button>
                <button type="button" onClick={() => setIsPurchaseModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Order Modal */}
      <AnimatePresence>
        {selectedOrderForEdit && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrderForEdit(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.form 
              onSubmit={handleSaveOrderEdit}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Edit Order Details</h3>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">{selectedOrderForEdit.id}</p>
                </div>
                <button type="button" onClick={() => setSelectedOrderForEdit(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                  <XSquare size={20} />
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto scrollbar-none text-left">
                {/* Customer Section */}
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <Users size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Information</span>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Customer Name</label>
                    <input 
                      required
                      type="text" 
                      value={editOrderData?.customer}
                      onChange={e => setEditOrderData({...editOrderData, customer: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      value={editOrderData?.phone}
                      onChange={e => setEditOrderData({...editOrderData, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Address</label>
                    <textarea 
                      required
                      rows={3}
                      value={editOrderData?.address}
                      onChange={e => setEditOrderData({...editOrderData, address: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Product Section */}
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <ShoppingBag size={16} className="text-orange-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product & Payment</span>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Product Detail</label>
                    <input 
                      required
                      type="text" 
                      value={editOrderData?.productName}
                      onChange={e => setEditOrderData({...editOrderData, productName: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-left">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Product Price</label>
                      <input 
                        required
                        type="number" 
                        value={editOrderData?.productPrice}
                        onChange={e => setEditOrderData({...editOrderData, productPrice: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                      />
                    </div>
                    <div className="text-left">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Del. Charge</label>
                      <input 
                        required
                        type="number" 
                        value={editOrderData?.deliveryCharge}
                        onChange={e => setEditOrderData({...editOrderData, deliveryCharge: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Cash on Delivery (COD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-slate-400 font-bold">৳</span>
                      <input 
                        type="number" 
                        value={editOrderData?.codAmount}
                        onChange={e => setEditOrderData({...editOrderData, codAmount: e.target.value})}
                        className="w-full pl-8 pr-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm text-blue-700"
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Status</label>
                    <select 
                      value={editOrderData?.status}
                      onChange={e => setEditOrderData({...editOrderData, status: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm appearance-none"
                    >
                      {['Pending', 'Approved', 'Follow Up', 'Ready Ship', 'Update Status', 'Cancelled'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 flex gap-3 border-t border-slate-100">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]">Update Order</button>
                <button type="button" onClick={() => setSelectedOrderForEdit(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-all active:scale-[0.98]">Cancel</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Customer Modal */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomerModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.form 
              onSubmit={handleAddCustomer}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
                <h3 className="text-xl font-bold text-slate-800">Add New Customer & Order</h3>
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                  <XSquare size={20} />
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto scrollbar-none">
                {/* Left Column: Customer Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <Users size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer Details</span>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Full Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Enter customer name"
                      value={newCustomerData.name}
                      onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm"
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="Phone"
                      value={newCustomerData.phone}
                      onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm"
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Address</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Enter full address"
                      value={newCustomerData.address}
                      onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Right Column: Order Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <ShoppingBag size={16} className="text-orange-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product & Payment</span>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Product Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="What are they buying?"
                      value={newCustomerData.productName}
                      onChange={e => setNewCustomerData({...newCustomerData, productName: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm"
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Product Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-slate-400 font-bold">৳</span>
                      <input 
                        required
                        type="number" 
                        placeholder="0.00"
                        value={newCustomerData.price}
                        onChange={e => setNewCustomerData({...newCustomerData, price: e.target.value})}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Del. Charge</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-slate-400 font-bold">৳</span>
                      <input 
                        required
                        type="number" 
                        placeholder="0.00"
                        value={newCustomerData.deliveryCharge}
                        onChange={e => setNewCustomerData({...newCustomerData, deliveryCharge: e.target.value})}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">COD Collection Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-slate-400 font-bold">৳</span>
                      <input 
                        type="number" 
                        placeholder="Total amount to collect"
                        value={newCustomerData.codAmount}
                        onChange={e => setNewCustomerData({...newCustomerData, codAmount: e.target.value})}
                        className="w-full pl-8 pr-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm text-blue-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 flex gap-3 border-t border-slate-100">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95">Save Customer & Order</button>
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-all active:scale-95">Cancel</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {selectedProductForEdit && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForEdit(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.form 
              onSubmit={handleSaveProductEdit}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Edit Product</h3>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedProductForEdit.id}</p>
                </div>
                <button type="button" onClick={() => setSelectedProductForEdit(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                  <XSquare size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Product Name</label>
                  <input 
                    required
                    type="text" 
                    value={editProductData?.name}
                    onChange={e => setEditProductData({...editProductData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Category</label>
                  <input 
                    type="text" 
                    value={editProductData?.category}
                    onChange={e => setEditProductData({...editProductData, category: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Selling Price</label>
                    <input 
                      required
                      type="number" 
                      value={editProductData?.price}
                      onChange={e => setEditProductData({...editProductData, price: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Stock Level</label>
                    <input 
                      required
                      type="number" 
                      value={editProductData?.stock}
                      onChange={e => setEditProductData({...editProductData, stock: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all">Update Product</button>
                <button type="button" onClick={() => setSelectedProductForEdit(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Order Information</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedOrder.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                  <XSquare size={20} />
                </button>
              </div>
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-none">
                {/* Status and Summary */}
                <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm border border-blue-50">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase block leading-none mb-1">Status</p>
                      <span className="text-xs font-bold text-blue-700">{selectedOrder.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase block leading-none mb-1">Booked On</p>
                    <p className="text-xs font-bold text-slate-700">{selectedOrder.date}, {selectedOrder.time}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Users size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Customer</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Name</p>
                      <p className="font-bold text-slate-800">{selectedOrder.customer}</p>
                    </div>
                    {selectedOrder.phone && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                        <p className="font-bold text-blue-600 pointer-events-auto cursor-pointer">{selectedOrder.phone}</p>
                      </div>
                    )}
                    {selectedOrder.address && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{selectedOrder.address}</p>
                      </div>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Package size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Product Info</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Product Details</p>
                      <p className="font-bold text-slate-800">{selectedOrder.productName || 'General Product'}</p>
                    </div>
                    <div className="grid grid-cols-2 pt-2 gap-4 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Product Price</p>
                        <p className="text-sm font-bold text-slate-800">৳ {(selectedOrder.productPrice || (selectedOrder.amount - (selectedOrder.deliveryCharge || 0))).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Del. Charge</p>
                        <p className="text-sm font-bold text-slate-800">৳ {(selectedOrder.deliveryCharge || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 pt-4 gap-4 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Bill</p>
                        <p className="text-lg font-black text-slate-900">৳ {selectedOrder.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-500 uppercase">Collect (COD)</p>
                        <p className="text-lg font-black text-blue-600">৳ {(selectedOrder.codAmount || selectedOrder.amount).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 flex gap-3 border-t border-slate-100">
                <button 
                  onClick={() => handleEditOrder(selectedOrder)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Package size={16} /> Edit Data
                </button>
                <button 
                  onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                  className={cn(
                    "flex-1 font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 relative border",
                    pendingStatus && pendingStatus !== selectedOrder.status 
                      ? "bg-amber-50 border-amber-200 text-amber-700 shadow-amber-500/10" 
                      : "bg-blue-600 border-blue-600 text-white shadow-blue-500/25"
                  )}
                >
                  <RefreshCw size={16} className={cn(isStatusMenuOpen && "animate-spin")} /> 
                  {pendingStatus || selectedOrder.status}
                  
                  <AnimatePresence>
                    {isStatusMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[120] overflow-hidden py-2"
                      >
                        {['Pending', 'Approved', 'Follow Up', 'Ready Ship', 'Update Status', 'Cancelled'].map(status => (
                          <div 
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusSelect(status);
                            }}
                            className={cn(
                              "px-4 py-2 text-xs text-left hover:bg-slate-50 transition-colors",
                              (pendingStatus || selectedOrder.status) === status ? "text-blue-600 font-bold bg-blue-50/50" : "text-slate-600 font-medium"
                            )}
                          >
                            {status}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                
                {pendingStatus && pendingStatus !== selectedOrder.status && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleSaveStatus}
                    className="px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Save
                  </motion.button>
                )}
                <button 
                  onClick={handlePrint}
                  className="flex-1 bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                >
                  Print Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <header className="h-16 bg-white border-b border-slate-200 text-brand-text flex items-center justify-between px-6 z-50 fixed top-0 w-full shadow-sm">
        <div className="flex items-center gap-6 flex-1">
          <button onClick={toggleSidebar} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 hidden sm:flex cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <span className="text-2xl font-black text-[#1e293b] tracking-tighter">WooCommerce</span>
            {isBackendConfigured ? (
              <span className="ml-2 px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                WooCommerce Live
              </span>
            ) : (
              <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full border border-amber-100 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Setup WooCommerce
              </span>
            )}
          </div>
          
          {/* Global Search Bar */}
          <div className="relative max-w-md w-full ml-4 block">
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('sync')}
            className={cn(
              "p-2 rounded-full transition-colors hidden md:flex",
              currentView === 'sync' ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-100"
            )}
            title="Sync WooCommerce"
          >
            <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          <div className="relative">
            <button 
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsUserMenuOpen(false);
                // Mark all as read when opening
                if (!isNotificationsOpen) {
                  setNotifications(prev => prev.map(n => ({...n, read: true})));
                }
              }}
              className={cn(
                "p-2 rounded-full text-slate-500 relative transition-colors",
                isNotificationsOpen ? "bg-slate-100 text-blue-600" : "hover:bg-slate-100"
              )}
            >
              <Bell size={22} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col"
                >
                  <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-700 flex justify-between items-center bg-slate-50/50">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-blue-600 hover:underline uppercase tracking-tight"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-none">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleNotificationClick(notif)}
                            className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <ShoppingBag size={14} className="text-blue-600" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800 line-clamp-1">{notif.title}</span>
                                <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</span>
                                <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{notif.time}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 px-4 text-center">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell size={18} className="text-slate-300" />
                        </div>
                        <p className="text-xs text-slate-400 font-medium italic">No new notifications</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 5 && (
                    <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                       <button className="text-[10px] font-bold text-slate-500 hover:text-blue-600 uppercase tracking-widest">View History</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 relative">
            <div 
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="flex flex-col text-right hidden lg:flex">
                <span className="text-sm font-semibold leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{userDisplayName}</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">{session?.user?.email}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm border-2 border-blue-50 shadow-sm transition-all group-hover:scale-105 active:scale-95 group-hover:shadow-md">
                {userInitials}
              </div>
            </div>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2"
                >
                  <div 
                    onClick={() => {
                      setCurrentView('settings');
                      setIsUserMenuOpen(false);
                    }}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-600 flex items-center gap-2"
                  >
                    <Settings size={16} /> API Settings
                  </div>
                  <div 
                    onClick={() => {
                      handleLogout();
                      setIsUserMenuOpen(false);
                    }}
                    className="border-t border-slate-100 mt-2 pt-2 px-4 py-2 hover:bg-red-50 cursor-pointer text-sm text-red-500 font-bold flex items-center gap-2"
                  >
                    <LogIn size={16} className="rotate-180" /> Logout
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="fixed inset-0 bg-slate-900/40 z-[51] backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-[260px] bg-white border-r border-slate-200 z-[52] shadow-2xl flex flex-col"
            >
              <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
                <span className="text-2xl font-black text-[#1e293b] tracking-tighter">WooCommerce</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 scrollbar-none">
                <SidebarItem 
                  icon={LayoutDashboard} 
                  label="Dashboard" 
                  active={currentView === 'dashboard'} 
                  onClick={() => {
                    setCurrentView('dashboard');
                    setSidebarOpen(false);
                  }}
                />
                <SidebarItem 
                  icon={RefreshCw} 
                  label="Sync Engine" 
                  active={currentView === 'sync'} 
                  onClick={() => {
                    setCurrentView('sync');
                    setSidebarOpen(false);
                  }}
                />
                <SidebarItem 
                  icon={Truck} 
                  label="Steadfast" 
                  active={currentView === 'steadfast'} 
                  onClick={() => {
                    setCurrentView('steadfast');
                    setSidebarOpen(false);
                  }}
                />
                <SidebarItem 
                  icon={ShoppingBag} 
                  label="Orders" 
                  hasDropdown 
                  isOpen={openMenus['orders']} 
                  onClick={() => toggleMenu('orders')}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('orders');
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "text-xs py-1.5 px-3 rounded-md transition-colors",
                      currentView === 'orders' ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-400 hover:text-blue-600 hover:bg-slate-100/50"
                    )}
                  >
                    All Orders
                  </div>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddNewModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    className="text-xs text-slate-400 py-1.5 px-3 rounded-md hover:text-blue-600 hover:bg-slate-100/50 transition-colors"
                  >
                    Add New Order
                  </div>
                </SidebarItem>
                <SidebarItem 
                  icon={Layers} 
                  label="Products" 
                  hasDropdown 
                  isOpen={openMenus['products']} 
                  onClick={() => toggleMenu('products')}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('products');
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "text-xs py-1.5 px-3 rounded-md transition-colors",
                      currentView === 'products' ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-400 hover:text-blue-600 hover:bg-slate-100/50"
                    )}
                  >
                    All Products
                  </div>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProductModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    className="text-xs text-slate-400 py-1.5 px-3 rounded-md hover:text-blue-600 hover:bg-slate-100/50 transition-colors"
                  >
                    Add Product
                  </div>
                </SidebarItem>
                <SidebarItem 
                  icon={ShoppingCart} 
                  label="Purchases" 
                  active={currentView === 'purchases'}
                  hasDropdown 
                  isOpen={openMenus['purchases']} 
                  onClick={() => toggleMenu('purchases')}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('purchases');
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "text-xs py-1.5 px-3 rounded-md transition-colors",
                      currentView === 'purchases' ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-400 hover:text-blue-600 hover:bg-slate-100/50"
                    )}
                  >
                    All Purchases
                  </div>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPurchaseModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    className="text-xs text-slate-400 py-1.5 px-3 rounded-md hover:text-blue-600 hover:bg-slate-100/50 transition-colors"
                  >
                    Record Cost
                  </div>
                </SidebarItem>
                <SidebarItem 
                  icon={Users} 
                  label="Customers" 
                  active={currentView === 'customers'}
                  hasDropdown 
                  isOpen={openMenus['customers']} 
                  onClick={() => toggleMenu('customers')}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('customers');
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "text-xs py-1.5 px-3 rounded-md transition-colors",
                      currentView === 'customers' ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-400 hover:text-blue-600 hover:bg-slate-100/50"
                    )}
                  >
                    All Customers
                  </div>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomerModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    className="text-xs text-slate-400 py-1.5 px-3 rounded-md hover:text-blue-600 hover:bg-slate-100/50 transition-colors cursor-pointer"
                  >
                    Add New Customer
                  </div>
                </SidebarItem>
                <SidebarItem 
                  icon={CheckSquare} 
                  label="My Tasks" 
                  hasDropdown 
                  isOpen={openMenus['tasks']} 
                  onClick={() => toggleMenu('tasks')}
                />
                <SidebarItem 
                  icon={Wallet} 
                  label="Accounts" 
                  hasDropdown 
                  isOpen={openMenus['accounts']} 
                  onClick={() => toggleMenu('accounts')}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('profile');
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "text-xs py-1.5 px-3 rounded-md transition-colors",
                      currentView === 'profile' ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-400 hover:text-blue-600 hover:bg-slate-100/50"
                    )}
                  >
                    Profile
                  </div>
                </SidebarItem>
                <SidebarItem 
                  icon={BarChart3} 
                  label="Reports" 
                  hasDropdown 
                  isOpen={openMenus['reports']} 
                  onClick={() => toggleMenu('reports')}
                />
                
                <div className="mt-4 mb-2 px-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Applications</span>
                </div>
                <SidebarItem icon={Package} label="Dropshipping" />
                <SidebarItem icon={Layers} label="Addons" />
                <SidebarItem icon={Store} label="Online Store" />
                
                <div className="mt-8 mb-4 border-t border-slate-100 pt-6">
                  <SidebarItem icon={BookOpen} label="Learning Center" />
                  <SidebarItem 
                    icon={Settings} 
                    label="Settings" 
                    active={currentView === 'settings'}
                    onClick={() => {
                      setCurrentView('settings');
                      setSidebarOpen(false);
                    }}
                  />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-24 px-6 pb-12 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {currentView === 'dashboard' ? 'Dashboard Overview' : 
             currentView === 'orders' ? 'All Orders' : 
             currentView === 'products' ? 'Inventory Management' : 
             currentView === 'settings' ? 'API Settings' :
             currentView === 'sync' ? 'Sync Dashboard' :
             currentView === 'steadfast' ? 'Steadfast Courier' :
             currentView === 'profile' ? 'User Profile' :
             'Expenditure & Purchases'}
          </h1>
          <div className="flex items-center space-x-3">
            {currentView === 'settings' && (
              <button 
                disabled={isConfigSaving || !wooConfig.url || !wooConfig.key || !wooConfig.secret}
                onClick={saveAccountSettings}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors uppercase tracking-widest active:scale-95 disabled:opacity-50"
              >
                {isConfigSaving ? 'Saving...' : 'Save'}
              </button>
            )}
            {currentView === 'orders' && (
              <button 
                onClick={() => setIsAddNewModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors shrink-0"
              >
                + New Order
              </button>
            )}
            {currentView === 'products' && (
              <button 
                onClick={() => setIsProductModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
              >
                + Add Product
              </button>
            )}
            {currentView === 'purchases' && (
              <button 
                onClick={() => setIsPurchaseModalOpen(true)}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-slate-900/20 hover:bg-slate-900 transition-colors"
              >
                + Record Cost
              </button>
            )}
            <div className="relative">
              <div 
                onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
                className="flex items-center bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors font-medium"
              >
                <Calendar size={16} className="mr-2 text-slate-400" />
                {timeRange === '7' ? 'Last 7 days' : 'Last 30 days'}
                <ChevronDown size={14} className="ml-2 text-slate-400 transition-transform duration-200" style={{ transform: isTimeRangeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </div>

              {isTimeRangeOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[150] py-2 w-40 overflow-hidden">
                  <div className="px-3 pb-2 mb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Select Range
                  </div>
                  <button 
                    onClick={() => { setTimeRange('7'); setIsTimeRangeOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center justify-between",
                      timeRange === '7' ? "text-blue-600 bg-blue-50/50" : "text-slate-600"
                    )}
                  >
                    Last 7 days
                    {timeRange === '7' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                  <button 
                    onClick={() => { setTimeRange('30'); setIsTimeRangeOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center justify-between",
                      timeRange === '30' ? "text-blue-600 bg-blue-50/50" : "text-slate-600"
                    )}
                  >
                    Last 30 days
                    {timeRange === '30' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleRefresh}
              className={cn(
                "bg-white border border-slate-200 p-2 rounded-lg hover:bg-slate-50 shadow-sm text-slate-500 transition-colors group",
                isRefreshing && "opacity-50 pointer-events-none"
              )}
            >
              <RefreshCw size={16} className={cn(
                "transition-transform",
                isRefreshing ? "animate-spin" : "group-active:rotate-180 duration-500"
              )} />
            </button>
          </div>
        </div>

        {currentView === 'steadfast' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Truck size={120} />
              </div>
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Steadfast Integration</h3>
                    <p className="text-sm text-slate-500">Automate your courier bookings directly from orders</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Key size={16} className="text-blue-500" />
                        Courier Credentials
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Connection Status</label>
                          <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            steadfastConfig.connected ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-500"
                          )}>
                            {steadfastConfig.connected ? (
                              <><CheckCircle2 size={10} /> Connected</>
                            ) : (
                              <><ShieldAlert size={10} /> Disconnected</>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <input 
                              type={showKeys ? "text" : "password"} 
                              placeholder="Steadfast API Key"
                              value={steadfastConfig.apiKey}
                              onChange={(e) => setSteadfastConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                            />
                          </div>
                          <div>
                            <input 
                              type={showKeys ? "text" : "password"} 
                              placeholder="Steadfast Secret Key"
                              value={steadfastConfig.secretKey}
                              onChange={(e) => setSteadfastConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-3 mt-4">
                            <button 
                              onClick={() => setShowKeys(!showKeys)}
                              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                              title={showKeys ? "Hide Keys" : "Show Keys"}
                            >
                              {showKeys ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button 
                              onClick={async () => {
                                // Basic validation for API Key and Secret
                                const keyRegex = /^[a-zA-Z0-9_\-]{15,}$/;
                                if (!keyRegex.test(steadfastConfig.apiKey) || !keyRegex.test(steadfastConfig.secretKey)) {
                                  addToast('Invalid Format', 'Please enter valid Steadfast API and Secret keys.', 'error');
                                  return;
                                }

                                setIsConfigSaving(true);
                                try {
                                  await supabase.from('settings').upsert({
                                    user_id: session?.user?.id,
                                    steadfast_api_key: steadfastConfig.apiKey,
                                    steadfast_secret_key: steadfastConfig.secretKey,
                                    updated_at: new Date().toISOString()
                                  }, { onConflict: 'user_id' });
                                  
                                  setSteadfastConfig(prev => ({ ...prev, connected: true }));
                                  addToast('Success', 'Steadfast Connection Activated', 'success');
                                } catch (e) {
                                  console.error(e);
                                  addToast('Error', 'Failed to save credentials', 'error');
                                } finally {
                                  setIsConfigSaving(false);
                                }
                              }}
                              disabled={isConfigSaving}
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isConfigSaving ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Verifying...</span>
                                </>
                              ) : 'Save & Activate Integration'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <RefreshCw size={16} className="text-blue-500" />
                        Webhook Configuration
                      </h4>
                      <div className="space-y-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Receiver URL</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-[10px] text-blue-600 bg-slate-50 p-2 rounded border border-slate-100 break-all">
                              {import.meta.env.VITE_SUPABASE_URL}/functions/v1/steadfast-webhook-receiver
                            </code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steadfast-webhook-receiver`);
                                addToast('Copied', 'Webhook URL copied to clipboard', 'success');
                              }}
                              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                            >
                              <Save size={14} />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                            Provide this URL in your <span className="font-bold">Steadfast Panel → Webhook Settings</span> to receive real-time status updates.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col items-center justify-center text-center min-h-[220px]">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 mb-2">Automated Integration</h4>
                      <p className="text-sm text-slate-500 max-w-xs">
                        Your courier bookings are now fully automated. New orders will be sent to Steadfast instantly once your credentials are saved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'sync' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">WooCommerce Sync Engine</h3>
                  <p className="text-sm text-slate-500">Manage real-time data synchronization with your store</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sync Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-700">Connected</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Last Update</span>
                  <span className="text-sm font-bold text-slate-700">Just Now</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Synced Items</span>
                  <span className="text-sm font-bold text-slate-700">{orders.length + products.length + categories.length}</span>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => {
                    handleRefresh();
                    setNotifications([{
                      id: Date.now(),
                      title: 'Manual Sync Started',
                      message: 'Fetching latest data from WooCommerce...',
                      time: 'Just now',
                      read: false
                    }, ...notifications]);
                  }}
                  disabled={isRefreshing}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                  {isRefreshing ? 'Synchronizing Data...' : 'Sync All Data Now'}
                </button>
                <p className="text-[10px] text-center text-slate-400 font-medium italic">
                  This will pull latest orders, products, and statistics from your WooCommerce store.
                </p>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-slate-400" />
                  Database Setup (Required)
                </h4>
                <div className="bg-slate-900 rounded-xl p-6 relative group">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SQL Migration Script (Run in Supabase)</span>
                    <button 
                      onClick={() => {
                        const sql = `ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS business_website TEXT,
ADD COLUMN IF NOT EXISTS steadfast_api_key TEXT,
ADD COLUMN IF NOT EXISTS steadfast_secret_key TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS product_category TEXT,
ADD COLUMN IF NOT EXISTS consignment_id TEXT,
ADD COLUMN IF NOT EXISTS tracking_code TEXT,
ADD COLUMN IF NOT EXISTS invoice_id TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL,
ADD COLUMN IF NOT EXISTS raw_webhook_payload JSONB;

CREATE TABLE IF NOT EXISTS categories (
  user_id UUID REFERENCES auth.users(id),
  category_id TEXT,
  name TEXT,
  description TEXT,
  count INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS products (
  user_id UUID REFERENCES auth.users(id),
  product_id TEXT,
  name TEXT,
  price DECIMAL,
  stock_status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, product_id)
);`;
                        navigator.clipboard.writeText(sql);
                        setNotifications([{id: Date.now(), title: 'Copied', message: 'SQL copied to clipboard', time: 'Just now', read: false}, ...notifications]);
                      }}
                      className="text-[10px] text-blue-400 font-bold hover:text-blue-300 uppercase tracking-widest transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-blue-100/80 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-blue-500/20 p-4 rounded-lg bg-slate-950">
                    {`-- IMPORTANT: ONLY run this SQL code in Supabase
-- DO NOT paste React/JavaScript code here

ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS business_website TEXT,
ADD COLUMN IF NOT EXISTS steadfast_api_key TEXT,
ADD COLUMN IF NOT EXISTS steadfast_secret_key TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS product_category TEXT,
ADD COLUMN IF NOT EXISTS consignment_id TEXT,
ADD COLUMN IF NOT EXISTS tracking_code TEXT,
ADD COLUMN IF NOT EXISTS invoice_id TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL,
ADD COLUMN IF NOT EXISTS raw_webhook_payload JSONB;

CREATE TABLE IF NOT EXISTS categories (
  user_id UUID REFERENCES auth.users(id),
  category_id TEXT,
  name TEXT,
  description TEXT,
  count INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS products (
  user_id UUID REFERENCES auth.users(id),
  product_id TEXT,
  name TEXT,
  price DECIMAL,
  stock_status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, product_id)
);`}
                  </pre>
                </div>
                <div className="mt-4 p-5 bg-red-50 border-2 border-red-200 rounded-xl animate-pulse">
                  <p className="text-xs text-red-800 leading-relaxed font-bold flex items-start gap-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>
                      সতর্কবার্তা: আপনি সুপাবেস (Supabase) এ ভুল কোড পেস্ট করছেন। 
                      নিচের নীল বক্সের কোডটি ছাড়া অন্য কোনো কোড (JavaScript) সুপাবেসে কাজ করবে না। 
                      দয়া করে শুধুমাত্র নিচের নীল বক্সের ভিতর থাকা SQL কোডটি কপি করে সুপাবেসের SQL Editor-এ রান করুন।
                    </span>
                  </p>
                </div>
              </div>

              {categories.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Synced Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <span key={cat.id} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">
                        {cat.name} ({cat.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-8 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                  <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                    <Users size={32} />
                  </div>
                  <div className="overflow-hidden w-full text-center sm:text-left">
                    <h3 className="text-xl font-bold text-slate-800 break-all">{userDisplayName}</h3>
                    <p className="text-sm text-slate-500 font-medium tracking-wide">{session?.user?.email}</p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      User ID: {session?.user?.id.substring(0, 8)}
                    </div>
                  </div>
                </div>

                <div className="space-y-8 pt-8 border-t border-slate-50">
                  <div className="pt-8 border-t border-slate-50">
                    <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                       <ShieldCheck size={18} className="text-slate-400" />
                       Account Security
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Full User ID</span>
                        <span className="text-[10px] font-mono text-slate-600 block truncate" title={session?.user?.id}>{session?.user?.id}</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Last Login</span>
                        <span className="text-xs font-medium text-slate-600 block">
                          {session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-8 flex justify-center sm:justify-end">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors uppercase tracking-widest active:scale-95"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatsCard label="Total Sales" value={wooStats.totalSales.toLocaleString()} symbol />
              <StatsCard label="Orders" value={wooStats.orderCount.toLocaleString()} subtext="Transactions" subtextColor="text-slate-400" />
              <StatsCard label="Item" value={products.length.toLocaleString()} subtext="SKU in Inventory" subtextColor="text-slate-400" />
              <StatsCard label="Avg Order Value" value={wooStats.avgOrderValue.toFixed(0).toLocaleString()} symbol />
            </div>

            {/* Middle Section: Chart and Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sales Chart */}
              <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-slate-700">Sales Over Time</h3>
                  <div className="flex space-x-2">
                    <span className="flex items-center text-[10px] text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
                      Gross Sales
                    </span>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.08}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                        tickFormatter={(val) => `৳${val / 1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                          padding: '12px',
                          backgroundColor: '#1e293b',
                          color: '#fff'
                        }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: '#3b82f6' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Grid (Secondary) */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                <StatusCard 
                  label="Pending" 
                  count={orders.filter(o => o.status === 'Pending').length} 
                  icon={Clock} 
                  colorClass="bg-orange-50" 
                  iconColor="text-orange-500"
                  active={statusFilter === 'Pending'}
                  onClick={() => setStatusFilter(statusFilter === 'Pending' ? null : 'Pending')}
                />
                <StatusCard 
                  label="Approved" 
                  count={orders.filter(o => o.status === 'Approved').length} 
                  icon={CheckCircle2} 
                  colorClass="bg-green-50" 
                  iconColor="text-green-500"
                  active={statusFilter === 'Approved'}
                  onClick={() => setStatusFilter(statusFilter === 'Approved' ? null : 'Approved')}
                />
                <StatusCard 
                  label="Follow Up" 
                  count={orders.filter(o => o.status === 'Follow Up').length} 
                  icon={Bell} 
                  colorClass="bg-purple-50" 
                  iconColor="text-purple-500"
                  active={statusFilter === 'Follow Up'}
                  onClick={() => setStatusFilter(statusFilter === 'Follow Up' ? null : 'Follow Up')}
                />
                <StatusCard 
                  label="Cancelled" 
                  count={orders.filter(o => o.status === 'Cancelled').length} 
                  icon={XSquare} 
                  colorClass="bg-red-50" 
                  iconColor="text-red-500"
                  active={statusFilter === 'Cancelled'}
                  onClick={() => setStatusFilter(statusFilter === 'Cancelled' ? null : 'Cancelled')}
                />
                <StatusCard 
                  label="Ready Ship" 
                  count={orders.filter(o => o.status === 'Ready Ship').length} 
                  icon={Truck} 
                  colorClass="bg-blue-50" 
                  iconColor="text-blue-500"
                  active={statusFilter === 'Ready Ship'}
                  onClick={() => setStatusFilter(statusFilter === 'Ready Ship' ? null : 'Ready Ship')}
                />
                <StatusCard 
                  label="Update Status" 
                  count={orders.filter(o => o.status === 'Update Status').length} 
                  icon={PackageCheck} 
                  colorClass="bg-emerald-50" 
                  iconColor="text-emerald-500"
                  active={statusFilter === 'Update Status'}
                  onClick={() => setStatusFilter(statusFilter === 'Update Status' ? null : 'Update Status')}
                />
              </div>
            </div>
          </>
        )}

        {currentView === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-8">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Import Settings</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-8">
                  Go to your <strong>WooCommerce Dashboard</strong>. Navigate to <strong>WooCommerce &gt; Settings &gt; Advanced &gt; REST API</strong>. Click Add Key and generate a new API key with <strong>Read/Write</strong> permissions.
                </p>

                <div className="space-y-6">
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">WooCommerce API Keys</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">Site URL</label>
                    <input 
                      type="url" 
                      placeholder="Enter a site url"
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                      value={wooConfig.url}
                      onChange={(e) => setWooConfig({ ...wooConfig, url: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">Consumer Key</label>
                    <input 
                      type="text" 
                      placeholder="Enter a consumer key"
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                      value={wooConfig.key}
                      onChange={(e) => setWooConfig({ ...wooConfig, key: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">Consumer Secret</label>
                    <div className="relative">
                      <input 
                        type={showKeys ? "text" : "password"} 
                        placeholder="Enter a consumer secret"
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12 placeholder:text-slate-300"
                        value={wooConfig.secret}
                        onChange={(e) => setWooConfig({ ...wooConfig, secret: e.target.value })}
                      />
                      <button 
                        onClick={() => setShowKeys(!showKeys)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-400"
                      >
                        {showKeys ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">Branch</label>
                    <div className="relative">
                      <select className="w-full px-11 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all text-slate-400">
                        <option>Select branch</option>
                      </select>
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={saveAccountSettings}
                      disabled={isConfigSaving}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isConfigSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                      {isConfigSaving ? 'Saving Changes...' : 'Save All Settings'}
                    </button>
                  </div>
                </div>

                {configError && (
                  <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-600 flex items-center gap-3">
                    <AlertCircle size={16} />
                    {configError}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <RefreshCw size={24} className="text-blue-500" />
                  Webhook Settings
                </h3>
              </div>

              <div className="space-y-6">
                {/* Alert Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
                  <AlertCircle className="text-amber-500 shrink-0" size={24} />
                  <p className="text-sm text-amber-900 leading-relaxed font-medium">
                    Before setup the webhook, make sure to update your import settings and sync your categories, products, and orders manually at least once.
                  </p>
                </div>

                {/* Instructions */}
                <div className="px-1 text-sm text-slate-600 leading-relaxed">
                  <p>
                    Go to your <strong>WooCommerce Dashboard</strong>. Navigate to 
                    <span className="font-bold"> WooCommerce &gt; Settings &gt; Advanced &gt; Webhooks</span>. 
                    Click <span className="text-blue-600 font-bold">Add webhook</span>.
                  </p>
                </div>

                  {/* Webhook Inputs */}
                <div className="space-y-6">
                  {/* Secret Key */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Webhook Secret Key</label>
                    </div>
                    <div className="p-4 flex flex-col items-center gap-4">
                      <input 
                        type="text" 
                        readOnly 
                        value={webhookSecret}
                        className="w-full px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50 rounded-xl text-center outline-none border border-transparent focus:border-blue-200 transition-all"
                      />
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                          onClick={generateWebhookSecret}
                          className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} />
                          <span>Regenerate</span>
                        </button>
                        <AnimatedCopyButton 
                          text={webhookSecret} 
                          onCopy={() => {
                            setNotifications([{id: Date.now(), title: 'Copied', message: 'Secret key copied', time: 'Just now', read: false}, ...notifications]);
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* URLs */}
                  <div className="grid grid-cols-1 gap-6">
                    {[
                      { label: 'Product Created Webhook URL', value: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woo-webhook?user_id=${session?.user?.id}&topic=product.created` },
                      { label: 'Product Updated Webhook URL', value: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woo-webhook?user_id=${session?.user?.id}&topic=product.updated` },
                      { label: 'Order Created Webhook URL', value: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woo-webhook?user_id=${session?.user?.id}&topic=order.created` },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/50">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</label>
                        </div>
                        <div className="p-4 flex flex-col items-center gap-4">
                          <input 
                            type="text" 
                            readOnly 
                            value={item.value}
                            className="w-full px-4 py-3 text-sm font-medium text-blue-600 bg-blue-50/30 rounded-xl text-center outline-none border border-transparent focus:border-blue-200 transition-all"
                          />
                          <AnimatedCopyButton 
                            text={item.value} 
                            onCopy={() => {
                              setNotifications([{id: Date.now(), title: 'Copied', message: 'Webhook URL copied', time: 'Just now', read: false}, ...notifications]);
                            }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conditional Tables Area */}
        {currentView === 'products' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Product Inventory</h3>
              <div className="flex gap-2">
                 <button className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">Export</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Item ID</th>
                    <th className="px-6 py-4 font-bold">Product Name</th>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold">Price</th>
                    <th className="px-6 py-4 font-bold">Stock</th>
                    <th className="px-6 py-4 font-bold text-center">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredProducts.map((product, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={product.id} 
                      onClick={() => handleEditProduct(product)}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{product.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{product.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{product.category}</td>
                      <td className="px-6 py-4 font-black text-slate-900">৳ {product.price.toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{product.stock}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full",
                          product.status === 'In Stock' ? "bg-green-100 text-green-700" :
                          product.status === 'Low Stock' ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-400 italic">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentView === 'purchases' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Purchase History</h3>
              <div className="flex gap-2">
                 <button className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">Export PDF</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Purchase ID</th>
                    <th className="px-6 py-4 font-bold">Supplier</th>
                    <th className="px-6 py-4 font-bold">Items</th>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold">Amount</th>
                    <th className="px-6 py-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredPurchases.map((purchase, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      key={purchase.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{purchase.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{purchase.supplier}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium text-xs italic">{purchase.items}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{purchase.date}</td>
                      <td className="px-6 py-4 font-black text-slate-900">৳ {purchase.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full",
                          purchase.status === 'Update Status' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {purchase.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-400 italic">No purchase records found matching "{searchQuery}".</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentView === 'customers' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Customer Database</h3>
              <div className="flex gap-2">
                 <button className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">Sync</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Customer ID</th>
                    <th className="px-6 py-4 font-bold">Name</th>
                    <th className="px-6 py-4 font-bold">Contact</th>
                    <th className="px-6 py-4 font-bold">Location</th>
                    <th className="px-6 py-4 font-bold text-right">Activity</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredCustomers.map((customer, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={customer.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{customer.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{customer.name}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-bold text-slate-700 block">{customer.phone}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium text-xs">{customer.address}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="inline-flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-800">{customer.totalOrders} Orders</span>
                            <span className="text-[10px] font-bold text-blue-600">৳ {customer.totalSpent.toLocaleString()}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomer(customer.id);
                            }}
                            className="p-1 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-400 italic">No customers found matching "{searchQuery}".</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (currentView === 'orders' || currentView === 'dashboard') ? (
          /* Recent Orders Table */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  {currentView === 'dashboard' ? 'Recent Orders' : 'Order List'}
                </h3>
                {isRefreshing && (
                  <RefreshCw className="animate-spin text-blue-600 h-3 w-3" />
                )}
              </div>
              {currentView === 'dashboard' && (
                <button 
                  onClick={() => setCurrentView('orders')}
                  className="text-xs font-bold text-blue-600 hover:underline transition-all"
                >
                  View All
                </button>
              )}
            </div>
            <div className={cn("overflow-x-auto transition-opacity duration-300", isRefreshing && "opacity-60")}>
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold">Order #</th>
                    <th className="px-6 py-4 font-bold">Date & Time</th>
                    <th className="px-6 py-4 font-bold">Customer</th>
                    <th className="px-6 py-4 font-bold">Product</th>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold">Amount</th>
                    <th className="px-6 py-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order, i) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.5) }}
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{order.id}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          <span className="font-medium text-slate-700 block">{order.date}</span>
                          <span className="text-[10px] text-slate-400">{order.time}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">{order.customer}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">{order.productName}</td>
                        <td className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md">{order.category}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">৳ {order.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-full",
                              order.status === 'Update Status' ? "bg-green-100 text-green-700" :
                              order.status === 'Pending' ? "bg-orange-100 text-orange-700" :
                              order.status === 'Cancelled' ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {order.status}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditOrder(order);
                              }}
                              className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(order.id);
                              }}
                              className="p-1 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 italic">No orders found matching your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {currentView === 'dashboard' && (
          /* Bottom Section (Learning Center) as seen in image_2 */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <BookOpen className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Learning Center</h3>
                <p className="text-xs text-slate-400">Tutorials and business guides</p>
              </div>
            </div>
            <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
              Explore
            </button>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <Store className="text-slate-600" size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Online Store</h3>
                <p className="text-xs text-slate-400">Manage your digital storefront</p>
              </div>
            </div>
            <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
              Manage
            </button>
          </div>
        </div>
      )}
    </main>

      {/* Global Toast Notifications */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md",
                toast.type === 'error' ? "bg-red-50/90 border-red-100 text-red-800" :
                toast.type === 'success' ? "bg-green-50/90 border-green-100 text-green-800" :
                "bg-blue-50/90 border-blue-100 text-blue-800"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                toast.type === 'error' ? "bg-red-100 text-red-600" :
                toast.type === 'success' ? "bg-green-100 text-green-600" :
                "bg-blue-100 text-blue-600"
              )}>
                {toast.type === 'error' ? <ShieldAlert size={18} /> : 
                 toast.type === 'success' ? <CheckCircle2 size={18} /> : 
                 <Info size={18} />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">{toast.title}</span>
                <span className="text-xs opacity-80 leading-tight">{toast.message}</span>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-auto p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer / Credits */}
      <footer className="py-8 text-center text-slate-400 text-[10px] font-medium uppercase tracking-[0.2em] opacity-60">
        WooCommerce Enterprise POS &bull; Version 2.0.4 &bull; &copy; 2026
      </footer>
    </div>
  );
}
