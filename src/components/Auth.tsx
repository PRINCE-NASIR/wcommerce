import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, AlertCircle, ShoppingBag } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfigMissing) {
      setError('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // If session was immediately created (no email verification)
        if (data?.session) {
          // App.tsx will handle the redirect
        } else {
          alert('Check your email for the confirmation link! Your new account is created.');
          setEmail('');
          setPassword('');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      let message = err.message;
      if (message.includes('Invalid path specified in request URL')) {
        message = 'Supabase URL is incorrect. Please check your VITE_SUPABASE_URL environment variable. It should look like: https://xyz.supabase.co';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
              <ShoppingBag size={24} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">WooCommerce</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isLogin ? 'Enter your credentials to access your dashboard' : 'Sign up to start managing your store'}
            </p>
          </div>

          {isConfigMissing && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8 flex items-start gap-3 text-amber-800 text-xs shadow-sm">
              <AlertCircle className="shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold mb-1 underline text-amber-900">Supabase Setup Required</p>
                <p className="mb-2">To connect your database, you must add your Supabase credentials to the **Secrets** menu in the top bar of Google AI Studio.</p>
                <div className="grid grid-cols-1 gap-2 mt-3">
                  <div className="bg-white/60 p-2 rounded border border-amber-200">
                    <p className="font-bold text-[9px] uppercase tracking-wider text-amber-700 mb-1">Step 1</p>
                    <p>Click the **Secrets** button at the top of this window.</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-amber-200">
                    <p className="font-bold text-[9px] uppercase tracking-wider text-amber-700 mb-1">Step 2</p>
                    <p>Add **VITE_SUPABASE_URL** with your project URL.</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-amber-200">
                    <p className="font-bold text-[9px] uppercase tracking-wider text-amber-700 mb-1">Step 3</p>
                    <p>Add **VITE_SUPABASE_ANON_KEY** with your Anon/Public API Key.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  autoComplete="username"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-11 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2 text-red-600 text-[11px] font-medium leading-tight">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-100 disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1.5 font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {isLogin ? 'Create one now' : 'Sign in instead'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
      
      <p className="text-[10px] text-slate-400 mt-8 font-medium uppercase tracking-[0.2em]">
        © 2026 WooCommerce Dashboard • All Rights Reserved
      </p>
    </div>
  );
}
