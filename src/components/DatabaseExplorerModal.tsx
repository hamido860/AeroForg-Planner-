import React, { useState, useEffect } from "react";
import { X, Database, Table2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DatabaseExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DatabaseExplorerModal: React.FC<DatabaseExplorerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"orders" | "teams" | "app_users">("orders");
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const endpoint = activeTab === "orders" ? "/api/orders" : 
                       activeTab === "teams" ? "/api/teams" : 
                       "/api/users";
      fetch(endpoint)
        .then(res => res.json())
        .then(resData => {
          setData(resData);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [isOpen, activeTab]);

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
            className="bg-[#0E1218] border border-[#1E2A38] rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col h-[90vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#1E2A38] bg-[#131920] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Database size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#E8EDF5]">Database Explorer</h2>
                  <p className="text-[11px] text-[#7A8EA8]">View raw sqlite rows for debugging</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 px-2 rounded-md hover:bg-white/5 text-[#7A8EA8] hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-48 border-r border-[#1E2A38] bg-[#131920] p-2 flex flex-col gap-1 shrink-0">
                <div className="text-[10px] font-bold text-[#3F5270] uppercase tracking-wider mb-2 px-2 mt-2">Tables</div>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all text-left ${activeTab === 'orders' ? 'bg-[#1E3A5F] text-[#3B82F6]' : 'text-[#7A8EA8] hover:bg-[#1A2230] hover:text-[#E8EDF5]'}`}
                >
                  <Table2 size={14} />
                  Orders
                </button>
                <button 
                  onClick={() => setActiveTab('teams')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all text-left ${activeTab === 'teams' ? 'bg-[#1E3A5F] text-[#3B82F6]' : 'text-[#7A8EA8] hover:bg-[#1A2230] hover:text-[#E8EDF5]'}`}
                >
                  <Table2 size={14} />
                  Teams
                </button>
                <button 
                  onClick={() => setActiveTab('app_users')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all text-left ${activeTab === 'app_users' ? 'bg-[#1E3A5F] text-[#3B82F6]' : 'text-[#7A8EA8] hover:bg-[#1A2230] hover:text-[#E8EDF5]'}`}
                >
                  <Table2 size={14} />
                  App Users
                </button>
              </div>

              {/* Data Table Area */}
              <div className="flex-1 overflow-auto bg-[#080B0F] p-4 text-[11px]">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center text-[#3F5270]">Loading...</div>
                ) : data && data.length > 0 ? (
                  <div className="w-max min-w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          {Object.keys(data[0]).map(key => (
                            <th key={key} className="px-3 py-2 bg-[#1A2230] text-[#3F5270] font-bold uppercase tracking-wider border border-[#1E2A38] whitespace-nowrap sticky top-0">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, i) => (
                          <tr key={i} className="hover:bg-[#131920]">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-3 py-2 border border-[#1E2A38] text-[#E8EDF5] whitespace-nowrap max-w-[200px] truncate">
                                {val === null ? <span className="text-[#3F5270] italic">null</span> : 
                                 typeof val === 'object' ? JSON.stringify(val) : 
                                 String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-[#3F5270]">No data found.</div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DatabaseExplorerModal;
