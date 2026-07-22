import React, { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Database, Save, Plus, Trash2, Edit3 } from "lucide-react";
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New mapping state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAeroField, setNewAeroField] = useState("");
  const [newHeliosField, setNewHeliosField] = useState("");
  const [newMeaning, setNewMeaning] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch("/api/mapping")
        .then(res => res.json())
        .then(data => {
          setMappings(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [isOpen]);

  const toggleEnabled = (id: string) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, is_enabled: !m.is_enabled } : m));
  };

  const handleFieldChange = (id: string, key: keyof MappingField, val: any) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [key]: val } : m));
  };

  const handleDeleteRule = (id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id));
    fetch(`/api/mapping/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const handleAddRule = () => {
    if (!newAeroField.trim() || !newHeliosField.trim()) return;
    const newRule: MappingField = {
      id: "map-" + Date.now(),
      aeroforg_field: newAeroField.trim().toUpperCase(),
      helios_field_name: newHeliosField.trim().toUpperCase(),
      helios_meaning: newMeaning.trim() || "Custom field mapping",
      is_enabled: true
    };
    setMappings(prev => [...prev, newRule]);
    setNewAeroField("");
    setNewHeliosField("");
    setNewMeaning("");
    setShowAddForm(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappings)
      });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setTimeout(() => onClose(), 600);
    } catch (e) {
      setIsSaving(false);
    }
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
            className="bg-[#0E1218] border border-[#1E2A38] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#1E2A38] bg-[#131920] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Database size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#E8EDF5]">Helios Field Mapping Manager</h2>
                  <p className="text-[11px] text-[#7A8EA8]">Map and edit AeroForg analytics to Helios Oracle / Excel fields</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-[11px] font-bold transition-all"
                >
                  <Plus size={14} />
                  Add Mapping Rule
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
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex gap-3">
                <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-200 leading-relaxed">
                  Configure custom column mappings between Helios CSV/Excel export headers and AeroForg internal fields. 
                  Changes persist automatically to the database on save.
                </p>
              </div>

              {/* Add New Rule Form */}
              {showAddForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-[#131920] border border-blue-500/30 rounded-lg p-3 space-y-3"
                >
                  <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Create New Column Mapping Rule</span>
                    <button onClick={() => setShowAddForm(false)} className="text-[#7A8EA8] hover:text-white"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[#7A8EA8] font-bold uppercase block mb-1">AeroForg Target Field</label>
                      <input
                        placeholder="e.g. REALISATION_TIME_HOURS"
                        value={newAeroField}
                        onChange={e => setNewAeroField(e.target.value)}
                        className="w-full bg-[#080B0F] border border-[#253345] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#E8EDF5] focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#7A8EA8] font-bold uppercase block mb-1">Helios / CSV Header Name</label>
                      <input
                        placeholder="e.g. TEMPS_EFFECTIF"
                        value={newHeliosField}
                        onChange={e => setNewHeliosField(e.target.value)}
                        className="w-full bg-[#080B0F] border border-[#253345] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#E8EDF5] focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#7A8EA8] font-bold uppercase block mb-1">Description / Meaning</label>
                      <input
                        placeholder="e.g. Actual fabrication hours"
                        value={newMeaning}
                        onChange={e => setNewMeaning(e.target.value)}
                        className="w-full bg-[#080B0F] border border-[#253345] rounded px-2.5 py-1.5 text-[11px] text-[#E8EDF5] focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddRule}
                      disabled={!newAeroField || !newHeliosField}
                      className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-[11px] font-bold transition-all"
                    >
                      Save Rule
                    </button>
                  </div>
                </motion.div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 px-3 py-1 text-[10px] font-bold text-[#3F5270] uppercase tracking-wider">
                    <div className="col-span-4">AeroForg Target</div>
                    <div className="col-span-4">Helios Header</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  {mappings.map((mapping) => (
                    <div 
                      key={mapping.id}
                      className="grid grid-cols-12 items-center bg-[#1A2230] border border-[#1E2A38] rounded-lg px-3 py-2.5 transition-colors hover:border-[#253345] gap-2"
                    >
                      <div className="col-span-4">
                        <input
                          value={mapping.aeroforg_field}
                          onChange={e => handleFieldChange(mapping.id, 'aeroforg_field', e.target.value)}
                          className="bg-[#080B0F] border border-[#253345] rounded px-2 py-1 text-[11px] font-mono text-[#E8EDF5] w-full focus:border-blue-500 outline-none"
                        />
                        <input
                          value={mapping.helios_meaning || ''}
                          onChange={e => handleFieldChange(mapping.id, 'helios_meaning', e.target.value)}
                          placeholder="Description..."
                          className="bg-transparent text-[10px] text-[#7A8EA8] mt-1 w-full outline-none focus:text-[#E8EDF5]"
                        />
                      </div>
                      <div className="col-span-4">
                        <input 
                          value={mapping.helios_field_name}
                          onChange={e => handleFieldChange(mapping.id, 'helios_field_name', e.target.value)}
                          className="bg-[#080B0F] border border-[#253345] rounded px-2 py-1 text-[11px] font-mono text-[#E8EDF5] w-full focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button 
                          onClick={() => toggleEnabled(mapping.id)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            mapping.is_enabled 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-[#080B0F] text-[#3F5270] border border-[#253345]'
                          }`}
                        >
                          <CheckCircle2 size={12} className={mapping.is_enabled ? 'opacity-100' : 'opacity-0'} />
                          {mapping.is_enabled ? 'ENABLED' : 'OFF'}
                        </button>
                      </div>
                      <div className="col-span-2 flex justify-end gap-1">
                        <button
                          onClick={() => handleDeleteRule(mapping.id)}
                          title="Delete Mapping Rule"
                          className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1E2A38] bg-[#131920] flex items-center justify-between">
              <span className="text-[11px] text-[#7A8EA8]">
                {mappings.length} mapping rules configured
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-[12px] font-bold text-[#7A8EA8] hover:text-[#E8EDF5] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-[12px] font-bold shadow-lg shadow-blue-500/20 transition-all"
                >
                  <Save size={16} />
                  {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Mappings"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MappingAdminModal;

