import React, { useState, useEffect } from "react";
import { X, UserPlus, Shield, Mail, CheckCircle2, UserCircle, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppUser } from "../domain/interfaces";

interface UsersAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UsersAdminModal: React.FC<UsersAdminModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/users")
        .then(res => res.json())
        .then(data => {
          setUsers(data);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'PLANNER': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'SUPERVISOR': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'QUALITY_AGENT': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-[#7A8EA8] bg-[#1A2230] border-[#1E2A38]';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#0E1218] border border-[#1E2A38] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#1E2A38] bg-[#131920] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Shield size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#E8EDF5]">Users & Permissions</h2>
                  <p className="text-[11px] text-[#7A8EA8]">Manage AeroForg access and role assignments</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-[11px] font-bold transition-all"
                >
                  <UserPlus size={14} />
                  Add User
                </button>
                <button 
                  onClick={onClose}
                  className="p-1 px-2 rounded-md hover:bg-white/5 text-[#7A8EA8] hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 px-3 py-2 text-[10px] font-bold text-[#3F5270] uppercase tracking-widest text-left">
                    <div className="col-span-4">Full Name / ID</div>
                    <div className="col-span-3">Email Address</div>
                    <div className="col-span-2 text-center">Role</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {users.map((user) => (
                    <div 
                      key={user.id}
                      className="grid grid-cols-12 items-center bg-[#1A2230] border border-[#1E2A38] rounded-lg px-3 py-3 transition-colors hover:border-[#253345] group"
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#212C3D] flex items-center justify-center text-[11px] font-bold text-[#7A8EA8]">
                          {user.full_name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-[12px] font-bold text-[#E8EDF5]">{user.full_name}</div>
                          <div className="text-[9px] text-[#3F5270] font-mono mt-0.5">{user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex items-center gap-2">
                        <Mail size={12} className="text-[#3F5270]" />
                        <span className="text-[11px] text-[#7A8EA8] truncate">{user.email}</span>
                      </div>
                      
                      <div className="col-span-2 flex justify-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                      
                      <div className="col-span-2 flex justify-center">
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold ${user.is_active ? 'text-emerald-400' : 'text-[#3F5270]'}`}>
                          <CheckCircle2 size={12} />
                          {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button className="p-1 px-2 rounded hover:bg-white/5 text-[#3F5270] hover:text-[#7A8EA8] opacity-0 group-hover:opacity-100 transition-all">
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1E2A38] bg-[#131920] flex justify-between items-center">
              <div className="text-[10px] text-[#3F5270]">
                Showing {users.length} registered users
              </div>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-[#212C3D] hover:bg-[#253345] text-[#E8EDF5] rounded-lg text-[12px] font-bold transition-all border border-[#1E2A38]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UsersAdminModal;
