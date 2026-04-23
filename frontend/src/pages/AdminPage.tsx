import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Shield, LogOut } from 'lucide-react';
import apiService from '../services/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) navigate('/admin/login');
  }, [navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiService.getUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = users.length;
  const today      = new Date().toDateString();
  const todayUsers = users.filter((u) => new Date(u.createdAt).toDateString() === today).length;

  if (!localStorage.getItem('adminToken')) return null;

  return (
    <div className="min-h-screen bg-[#020617] py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-500 text-sm">Registered users overview</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { localStorage.removeItem('adminToken'); navigate('/admin/login'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Admin Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[
            { label: 'Total Users',      value: totalUsers,  icon: Users,  color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' },
            { label: 'Signed Up Today',  value: todayUsers,  icon: Shield, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#0f172a] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl border ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-5 relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 max-w-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No users found.</div>
          ) : (
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-white/[0.02]">
                <tr>
                  {['Name', 'Email', 'Signup Date'].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-white">{u.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-400">{u.email}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{new Date(u.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
