import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ShieldCheck, Search, Plus, Minus, User as UserIcon, Loader2 } from 'lucide-react';

interface UserProfile {
  id: string; // The user's UID
  email?: string; // We might not have email in DB if we didn't save it, but we can try to fetch it or rely on UID
  credits: number;
}

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserProfile[];
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUpdateCredits = async (userId: string, currentCredits: number, change: number) => {
    setUpdateLoading(userId);
    try {
      const newCredits = Math.max(0, currentCredits + change);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        credits: newCredits
      });
      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, credits: newCredits } : u));
    } catch (error) {
      console.error("Error updating credits:", error);
      alert('Failed to update credits. Check permissions.');
    } finally {
      setUpdateLoading(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[400px] bg-red-900/20 blur-[120px] rounded-full point-events-none mix-blend-screen hidden md:block"></div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
              <ShieldCheck className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Super Admin Panel</h1>
              <p className="text-sm text-zinc-400">Manage user credits and access</p>
            </div>
          </div>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Exit Admin
          </button>
        </header>

        <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center bg-black border border-white/10 rounded-xl px-4 py-3 mb-6 focus-within:border-red-500/50 transition-colors">
            <Search className="w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search users by ID or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-white placeholder-zinc-500 text-sm focus:outline-none ml-3"
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="py-4 px-4 font-semibold">User</th>
                    <th className="py-4 px-4 font-semibold">Current Credits</th>
                    <th className="py-4 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                              <UserIcon className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div>
                              <div className="font-mono text-xs text-white">{user.id}</div>
                              {user.email && <div className="text-xs text-zinc-500 mt-1">{user.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-sm border border-indigo-500/20">
                            {user.credits}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleUpdateCredits(user.id, user.credits, -5)}
                              disabled={updateLoading === user.id}
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-md transition-colors text-zinc-300"
                              title="Remove 5 Credits"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateCredits(user.id, user.credits, 50)}
                              disabled={updateLoading === user.id}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 disabled:opacity-50 rounded-md transition-colors text-emerald-400"
                              title="Add 50 Credits"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-zinc-500 text-sm">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
