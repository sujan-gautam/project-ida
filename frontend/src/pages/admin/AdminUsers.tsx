import React, { useEffect, useState } from 'react';
import {
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Shield,
    ShieldAlert,
    Database,
    Key,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api';
import { User } from '../../types';
import toast from 'react-hot-toast';

interface AdminUser extends User {
    _id: string; // Backend returns _id
    apiKeyCount: number;
    datasetCount: number;
    createdAt: string;
}

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to first page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        loadUsers();
    }, [page, debouncedSearch]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getUsers({ page, limit: 10, search: debouncedSearch });
            setUsers(response.data.users);
            setTotalPages(response.data.pagination.pages);
        } catch (error: any) {
            toast.error('Failed to load users');
            console.error('Users error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-4 md:p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                            <Users className="w-10 h-10 text-blue-500" />
                            Users Management
                        </h1>
                        <p className="text-slate-400">View and manage registered users</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full md:w-64 bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700/50 bg-slate-800/60">
                                    <th className="p-4 text-slate-400 font-medium text-sm">User</th>
                                    <th className="p-4 text-slate-400 font-medium text-sm">Role</th>
                                    <th className="p-4 text-slate-400 font-medium text-sm">Stats</th>
                                    <th className="p-4 text-slate-400 font-medium text-sm">Joined</th>
                                    <th className="p-4 text-slate-400 font-medium text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                            <p className="mt-2 text-slate-400 text-sm">Loading users...</p>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <motion.tr
                                            key={user._id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                                        >
                                            <td className="p-4">
                                                <div>
                                                    <p className="text-white font-medium">{user.name}</p>
                                                    <p className="text-slate-400 text-sm">{user.email}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${user.isAdmin
                                                            ? 'bg-purple-500/20 text-purple-400'
                                                            : 'bg-slate-700 text-slate-400'
                                                        }`}
                                                >
                                                    {user.isAdmin ? (
                                                        <>
                                                            <ShieldAlert className="w-3 h-3" /> Admin
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Shield className="w-3 h-3" /> User
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-4 text-sm text-slate-300">
                                                    <div className="flex items-center gap-1" title="API Keys">
                                                        <Key className="w-4 h-4 text-emerald-500" />
                                                        {user.apiKeyCount}
                                                    </div>
                                                    <div className="flex items-center gap-1" title="Datasets">
                                                        <Database className="w-4 h-4 text-blue-500" />
                                                        {user.datasetCount}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-300 text-sm">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && users.length > 0 && (
                        <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
                            <p className="text-sm text-slate-400">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
