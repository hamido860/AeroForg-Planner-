import React, { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Database, Save } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MappingField {
  id: string;
  aeroforg_field: string;
  helios_field_name: string;
  helios_meaning: string;
  is_enabled: boolean;
}

interface MappingAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MappingAdminModal: React.FC<MappingAdminModalProps> = ({ isOpen, onClose }) => {
  const [mappings, setMappings] = useState<MappingField[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/mapping")
        .then(res => res.json())
        .then(data => {
          setMappings(data);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const toggleEnabled = (id: string) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, is_enabled: !m.is_enabled } : m));
  };

  const handleSave = () => {
    // In a real app we'd POST to /api/mapping
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#0E1218] border border-[#1E2A38] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#1E2A38] bg-[#131920] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Database size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#E8EDF5]">Helios Feedback Mapping</h2>
                  <p className="text-[11px] text-[#7A8EA8]">Map AeroForg analytics to Helios Oracle fields</p>
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
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4 flex gap-3">
                <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-200 leading-relaxed">
                  Direct Oracle staging update is restricted. Use these mappings to prepare the CSV feedback. 
                  Contact the ERP Admin to approve new column injections.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 px-3 py-1 text-[10px] font-bold text-[#3F5270] uppercase tracking-wider">
                    <div className="col-span-5">AeroForg Field</div>
                    <div className="col-span-4">Helios Field</div>
                    <div className="col-span-3 text-right">Status</div>
                  </div>
                  {mappings.map((mapping) => (
                    <div 
                      key={mapping.id}
                      className="grid grid-cols-12 items-center bg-[#1A2230] border border-[#1E2A38] rounded-lg px-3 py-2.5 transition-colors hover:border-[#253345]"
                    >
                      <div className="col-span-5">
                        <div className="text-[12px] font-mono text-[#E8EDF5]">{mapping.aeroforg_field}</div>
                        <div className="text-[10px] text-[#3F5270] mt-1">{mapping.helios_meaning}</div>
                      </div>
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <input 
                            defaultValue={mapping.helios_field_name}
                            className="bg-[#080B0F] border border-[#253345] rounded px-2 py-1 text-[11px] font-mono w-full focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="col-span-3 flex justify-end">
                        <button 
                          onClick={() => toggleEnabled(mapping.id)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-[10px] font-bold transition-all ${
                            mapping.is_enabled 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-[#080B0F] text-[#3F5270] border border-[#253345]'
                          }`}
                        >
                          <CheckCircle2 size={12} className={mapping.is_enabled ? 'opacity-100' : 'opacity-0'} />
                          {mapping.is_enabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1E2A38] bg-[#131920] flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-[12px] font-bold text-[#7A8EA8] hover:text-[#E8EDF5] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[12px] font-bold shadow-lg shadow-blue-500/20 transition-all"
              >
                <Save size={16} />
                Save Mapping
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MappingAdminModal;
