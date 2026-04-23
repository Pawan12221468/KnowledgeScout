import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import apiService from '../services/api';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [isLoading, setIsLoading]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { token } = await apiService.adminLogin(email, password);
      localStorage.setItem('adminToken', token);
      navigate('/admin');
    } catch {
      setError('Invalid admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-xl shadow-red-500/30">
                <Shield className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Sign In</h1>
            <p className="mt-2 text-slate-400 text-sm">Owner-only access</p>
          </div>

          <div className="bg-[#0f172a] border border-white/5 rounded-3xl p-8 shadow-2xl">
            <form className="space-y-5" onSubmit={handleSubmit}>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input id="email" name="email" type="email" autoComplete="username" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10" placeholder="Enter admin email" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10 pr-10" placeholder="Enter admin password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 transition-all text-sm disabled:opacity-50">
                {isLoading ? 'Signing in…' : 'Sign in as Admin'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
