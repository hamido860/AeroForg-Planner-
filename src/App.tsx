import { useState, useMemo } from "react";
import { 
  LayoutDashboard, 
  Calendar, 
  Package, 
  Users, 
  Database, 
  BarChart3, 
  Search, 
  Download, 
  Upload,
  Plus, 
  Edit2, 
  MoreHorizontal, 
  X, 
  ChevronRight,
  AlertTriangle,
  Plane,
  Building2,
  MapPin,
  Send,
  Menu,
  Settings,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React from "react";
import HeliosImportModal from "./components/HeliosImportModal";
import MappingAdminModal from "./components/MappingAdminModal";

const COLORS = {
  // Backgrounds — 4 distinct elevation levels
  bg0: "#080B0F",       // deepest: app shell
  bg1: "#0E1218",       // sidebar
  bg2: "#131920",       // main content
  bg3: "#1A2230",       // cards, panels, rows
  bg4: "#212C3D",       // hover states, inputs

  // Borders
  border0: "#1E2A38",
  border1: "#253345",

  // Text
  textPrimary: "#E8EDF5",
  textSecondary: "#7A8EA8",
  textMuted: "#3F5270",

  // Accent — single strong brand blue
  accent: "#3B82F6",
  accentDim: "#1E3A5F",

  // Status — clearly distinct
  scheduled: { bg: "#1A3A5C", border: "#2563EB", text: "#60A5FA", dot: "#3B82F6" },
  active:    { bg: "#0F3320", border: "#16A34A", text: "#4ADE80", dot: "#22C55E" },
  delayed:   { bg: "#3D1A0A", border: "#C2410C", text: "#FB923C", dot: "#F97316" },
  complete:  { bg: "#1A2E1A", border: "#15803D", text: "#86EFAC", dot: "#4ADE80" },
  warning:   { bg: "#3D2E0A", border: "#B45309", text: "#FCD34D", dot: "#F59E0B" },
};

interface Order {
  id: string;
  label: string;
  part_number: string;
  estimated_hours: number;
  quality_status: string;
  rework_count: number;
  realisation_time_hours: number;
  realisation_progress_percent: number;
  time_consumption_percent: number;
  computed_status: string;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  OPEN: { bg: "#1A3A5C", border: "#2563EB", text: "#60A5FA", dot: "#3B82F6" },
  'IN PROGRESS': { bg: "#0F3320", border: "#16A34A", text: "#4ADE80", dot: "#22C55E" },
  DELAYED: { bg: "#3D1A0A", border: "#C2410C", text: "#FB923C", dot: "#F97316" },
  FINISH: { bg: "#1A2E1A", border: "#15803D", text: "#86EFAC", dot: "#4ADE80" },
  'OUT START': { bg: "#3D2E0A", border: "#B45309", text: "#FCD34D", dot: "#F59E0B" },
};

const days = ["Mon 23", "Tue 24", "Wed 25", "Thu 26", "Fri 27"];
const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

const Avatar = ({ initials, size = 28 }: { initials: string; size?: number }) => (
  <div 
    className="flex items-center justify-center rounded-full font-mono font-semibold text-[10px] shrink-0"
    style={{
      width: size, height: size,
      background: COLORS.bg4, border: `1px solid ${COLORS.border1}`,
      color: COLORS.textSecondary,
    }}
  >
    {initials}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status as keyof typeof statusConfig] || statusConfig.OPEN;
  return (
    <span 
      className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded uppercase"
      style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        color: cfg.text,
      }}
    >
      {status}
    </span>
  );
};

const GanttBar = ({ order, onClick, selected, segmentWidth }: { order: Order; onClick: (o: Order) => void; selected: boolean; segmentWidth: number }) => {
  const cfg = statusConfig[order.computed_status as keyof typeof statusConfig] || statusConfig.OPEN;
  
  // Mapping logic for demo: we use id ending to determine positions if not in order object
  // For this implementation, we'll just mock position for now or assume a default
  const col = 2; // Default starting position
  const span = Math.max(1, Math.round(order.estimated_hours / 10)); 
  
  const left = `${col * segmentWidth}%`;
  const width = `${span * segmentWidth - 0.2}%`;
  
  return (
    <motion.div
      layoutId={order.id}
      onClick={() => onClick(order)}
      className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md flex items-center px-1.5 gap-1 cursor-pointer transition-shadow overflow-hidden z-10"
      style={{
        left, width,
        background: cfg.bg,
        border: `1.5px solid ${selected ? cfg.text : cfg.border}`,
        boxShadow: selected ? `0 0 0 2px ${cfg.border}40` : "none",
      }}
      whileHover={{ scale: 1.02, zIndex: 20 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      <span 
        className="text-[10px] font-medium truncate font-mono leading-none"
        style={{ color: cfg.text }}
      >
        {order.label}
      </span>
    </motion.div>
  );
};

export default function AeroForgPlanner() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [selectedJob, setSelectedJob] = useState<Order | null>(null);
  const [activeJobId, setActiveJobId] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [viewMode, setViewMode] = useState("Week");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMiniSidebar, setIsMiniSidebar] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);

  React.useEffect(() => {
    fetch("/api/orders")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data);
          if (data.length > 0 && !selectedJob) setSelectedJob(data[0]);
        } else {
          console.error("API error or invalid data format:", data);
        }
      })
      .catch(err => console.error("Fetch error:", err));
  }, []);

  const timelineSegments = useMemo(() => {
    if (viewMode === "Day") return hours;
    if (viewMode === "Month") return Array.from({ length: 30 }, (_, i) => `${i + 1}`);
    return days;
  }, [viewMode]);

  const segmentWidth = useMemo(() => 100 / timelineSegments.length, [timelineSegments]);

  const filteredOrders = useMemo(() => {
    const baseOrders = Array.isArray(orders) ? orders : [];
    if (!searchVal) return baseOrders;
    return baseOrders.filter(o => 
      o.label.toLowerCase().includes(searchVal.toLowerCase()) || 
      o.part_number.toLowerCase().includes(searchVal.toLowerCase())
    );
  }, [searchVal, orders]);

  return (
    <div className="flex h-screen bg-[#080B0F] font-sans text-[#E8EDF5] overflow-hidden text-sm relative">
      {/* Dev Mode Badge */}
      <div className="absolute top-0 right-0 z-[100] pointer-events-none">
        <div className="bg-orange-500/10 border-b border-l border-orange-500/20 px-3 py-1 rounded-bl-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] font-bold text-orange-400 tracking-widest uppercase">DEV MODE — SQLite</span>
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMiniSidebar ? 64 : 208, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-[#0E1218] border-r border-[#1E2A38] flex flex-col shrink-0 z-50 absolute md:relative h-full"
          >
            {/* Brand */}
            <div className={`p-4 pb-3 border-b border-[#1E2A38] flex ${isMiniSidebar ? 'justify-center' : 'justify-between'} items-center overflow-hidden h-[60px]`}>
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ background: COLORS.accentDim, border: `1px solid ${COLORS.accent}40` }}
                >
                  <Plane size={18} className="text-blue-400" />
                </div>
                <AnimatePresence>
                  {!isMiniSidebar && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="font-bold text-[13px] leading-tight whitespace-nowrap">AeroForg Planner</div>
                      <div className="text-[10px] text-[#3F5270] tracking-widest uppercase font-semibold">Production Intelligence</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {!isMiniSidebar && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="md:hidden text-[#7A8EA8] hover:text-white" 
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Nav */}
            <nav 
              className="p-2 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden"
              onDoubleClick={() => setIsMiniSidebar(!isMiniSidebar)}
            >
              {[
                { icon: LayoutDashboard, label: "Dashboard" },
                { icon: Calendar, label: "Scheduler", active: true },
                { icon: Package, label: "Inventory" },
                { icon: Users, label: "Resources" },
                { icon: Database, label: "Database" },
                { icon: BarChart3, label: "Reports" },
              ].map(({ icon: Icon, label, active }) => (
                <div 
                  key={label} 
                  className={`flex items-center ${isMiniSidebar ? 'justify-center px-0' : 'gap-2.5 px-2.5'} py-2 rounded-md cursor-pointer transition-colors ${
                    active ? 'bg-[#1E3A5F] border border-[#3B82F6]30 text-[#3B82F6]' : 'text-[#7A8EA8] hover:bg-[#212C3D] hover:text-[#E8EDF5]'
                  } relative group`}
                  title={isMiniSidebar ? label : ""}
                >
                  <Icon size={16} className={`${active ? "opacity-100" : "opacity-60"} shrink-0`} />
                  <AnimatePresence mode="popLayout">
                    {!isMiniSidebar && (
                      <motion.span 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        className={`text-[13px] whitespace-nowrap ${active ? 'font-semibold' : 'font-normal'}`}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  {isMiniSidebar && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#1A2230] text-[#E8EDF5] text-[11px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-[#1E2A38] shadow-xl transition-opacity">
                      {label}
                    </div>
                  )}
                </div>
              ))}

              {/* Metric Legend */}
              {!isMiniSidebar && (
                <div className="mx-2 mt-8 mb-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <BarChart3 size={12} />
                    AeroForg Metrics
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-[10px] text-[#E8EDF5] font-semibold mb-0.5">Realisation Progress</div>
                      <p className="text-[9px] text-[#7A8EA8] leading-tight">Physical completion based on task weighing. Target: 100%.</p>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#E8EDF5] font-semibold mb-0.5">Time Consumption</div>
                      <p className="text-[9px] text-[#7A8EA8] leading-tight">Actual time vs Estimated. Detection of overrun if &gt;100%.</p>
                    </div>
                  </div>
                </div>
              )}
            </nav>

            {/* User Profile */}
            <div className={`p-3 border-t border-[#1E2A38] bg-[#080B0F]/50 ${isMiniSidebar ? 'flex justify-center' : ''} h-[64px]`}>
              <div className={`flex items-center ${isMiniSidebar ? 'justify-center p-1' : 'justify-between p-2'} rounded-md hover:bg-[#212C3D] cursor-pointer transition-all duration-300 overflow-hidden w-full`}>
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Avatar initials="JD" size={32} />
                  <AnimatePresence>
                    {!isMiniSidebar && (
                      <motion.div 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="text-[12px] font-semibold text-[#E8EDF5] truncate whitespace-nowrap">John Doe</div>
                        <div className="text-[10px] text-[#7A8EA8] truncate whitespace-nowrap">Production Manager</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <AnimatePresence>
                  {!isMiniSidebar && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <Settings size={14} className="text-[#7A8EA8] shrink-0" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#131920] relative">
        {/* Top bar */}
        <header className="h-[52px] flex items-center justify-between px-4 md:px-5 border-b border-[#1E2A38] bg-[#0E1218]">
          <div className="flex items-center gap-3 md:gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-md text-[#7A8EA8] hover:text-[#E8EDF5] hover:bg-[#212C3D] transition-colors md:hidden"
              >
                <Menu size={18} />
              </button>
            )}
            <h2 className="text-[14px] md:text-[15px] font-bold truncate">Production Schedule</h2>
            <div className="hidden sm:flex gap-0.5 bg-[#080B0F] rounded-md p-0.5 border border-[#1E2A38]">
              {["Day", "Week", "Month"].map(v => (
                <button 
                  key={v} 
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1 rounded-[4px] text-[12px] cursor-pointer transition-all ${
                    v === viewMode ? 'bg-[#3B82F6] text-white font-semibold' : 'text-[#7A8EA8] hover:text-[#E8EDF5]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-[#080B0F] border border-[#253345] rounded-md px-3 py-1.5 w-48 focus-within:border-[#3B82F6] transition-colors">
              <Search size={14} className="text-[#3F5270]" />
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Search jobs..."
                className="bg-transparent border-none outline-none text-[12px] w-full placeholder-[#3F5270]"
              />
            </div>
            
            {/* Status filter */}
            <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 bg-[#080B0F] border border-[#253345] rounded-md">
              {[
                { label: "SCHEDULED", cfg: COLORS.scheduled },
                { label: "ACTIVE", cfg: COLORS.active },
                { label: "DELAYED", cfg: COLORS.delayed },
              ].map(({ label, cfg }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                  <span className="text-[10px] font-bold tracking-wider" style={{ color: cfg.text }}>{label}</span>
                </div>
              ))}
            </div>
            
            {/* Import */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[12px] bg-[#3B82F6] border border-[#3B82F6] text-white hover:bg-blue-600 transition-all cursor-pointer"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Import</span>
            </motion.button>
            
            {/* Export */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                fetch("/api/export-csv", { method: "POST" })
                  .then(res => res.json())
                  .then(data => alert("CSV Generation Prepared: " + data.message + "\nCheck console for payload structure. Direct Oracle update requires ERP admin validation."));
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[12px] bg-[#212C3D] border border-[#253345] text-[#7A8EA8] hover:text-[#E8EDF5] hover:bg-[#253345] transition-all cursor-pointer"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export Feedback</span>
            </motion.button>
          </div>
        </header>

        {/* Gantt Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto relative">
            {/* Timeline Header */}
            <div className="flex items-center h-9 border-b border-[#1E2A38] bg-[#0E1218] sticky top-0 z-30">
              <div className="w-[280px] px-4 flex items-center justify-between border-r border-[#1E2A38] shrink-0">
                <span className="text-[10px] font-bold tracking-widest text-[#3F5270] uppercase">Primary Assembly</span>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#1E3A5F] border border-[#3B82F6]50 text-[#3B82F6] font-semibold hover:bg-[#3B82F6] hover:text-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Add</span>
                </motion.button>
              </div>
              <div className="flex-1 flex overflow-x-hidden">
                {timelineSegments.map((seg, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-center border-r border-[#1E2A38] text-[9px] font-semibold text-[#7A8EA8] h-full`}
                    style={{ flex: `0 0 ${segmentWidth}%` }}
                  >
                    {seg}
                  </div>
                ))}
              </div>
            </div>

            {/* Job Rows */}
            <div className={`min-w-fit flex flex-col`}>
              {filteredOrders.map((order, idx) => (
                <div
                  key={order.id}
                  className={`flex h-11 border-b border-[#1E2A38] transition-colors group relative ${
                    idx % 2 === 0 ? 'bg-[#131920]' : 'bg-[#1A2230]/30'
                  } hover:bg-[#212C3D]/40`}
                >
                  {/* Label Column */}
                  <div className="w-[280px] px-3 flex items-center gap-3 border-r border-[#1E2A38] shrink-0 sticky left-0 z-20 bg-inherit group-hover:bg-[#212C3D]">
                    <Avatar initials={order.label.charAt(0)} />
                    <div className="overflow-hidden">
                      <div className="text-[12px] font-medium truncate">{order.label}</div>
                      <div className="text-[10px] text-[#3F5270] font-mono">{order.part_number}</div>
                    </div>
                  </div>

                  {/* Timeline Track */}
                  <div 
                    className="flex-1 relative" 
                    style={{ 
                      minWidth: viewMode === "Day" ? '1056px' : '800px',
                      backgroundSize: `${segmentWidth}% 100%`,
                      backgroundImage: `linear-gradient(to right, #1E2A38 1px, transparent 1px)`
                    }}
                  >
                    {/* Horizontal Grid Pattern for "Squared" effect */}
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundSize: `${segmentWidth}% 44px`,
                        backgroundImage: `linear-gradient(to bottom, #1E2A38 1px, transparent 1px)`
                      }}
                    />

                    <GanttBar 
                      order={order} 
                      onClick={setSelectedJob} 
                      selected={selectedJob?.id === order.id} 
                      segmentWidth={segmentWidth}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Status Bar */}
            <div className="sticky bottom-0 z-30 px-4 py-2 flex gap-5 items-center border-t border-[#1E2A38] bg-[#0E1218] text-[11px] text-[#7A8EA8]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                <span>Shift: 08:00 – 18:00</span>
              </div>
              <span className="text-[#253345]">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500/40" />
                <span>Break: 12:00 (1h)</span>
              </div>
              <span className="text-[#253345]">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[#4ADE80] font-semibold">89% Capacity Utilization</span>
              </div>
            </div>
          </div>

          {/* DETAIL PANEL */}
          <AnimatePresence>
            {selectedJob && (
              <motion.aside 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-[320px] bg-[#0E1218] border-l border-[#1E2A38] flex flex-col overflow-auto shrink-0 z-40"
              >
                {/* Panel Header */}
                <div className="p-4 border-b border-[#1E2A38]">
                  <div className="flex items-center justify-between mb-3">
                    <StatusBadge status={selectedJob.computed_status} />
                    <div className="flex gap-1">
                      {[
                        { icon: Database, action: 'mapping' },
                        { icon: X, action: 'close' }
                      ].map(({ icon: Icon, action }) => (
                        <button 
                          key={action}
                          onClick={() => {
                            if (action === 'close') setSelectedJob(null);
                            if (action === 'mapping') setIsMappingOpen(true);
                          }}
                          className="p-1.5 rounded-md text-[#3F5270] hover:text-[#E8EDF5] hover:bg-[#212C3D] transition-all cursor-pointer"
                        >
                          <Icon size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <h3 className="text-base font-bold mb-1">
                    {selectedJob.id}
                  </h3>
                  <p className="text-[12px] text-[#7A8EA8] leading-relaxed">
                    Integrated realization tracking for Helios ERP. Real-time metrics computed from AeroForg tasks and time logs.
                  </p>
                </div>

                {/* Realisation Metrics */}
                <div className="p-4 border-b border-[#1E2A38]">
                  <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase mb-3">Realisation Metrics</div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#7A8EA8]">Physical Progress</span>
                        <span className="font-bold text-[#4ADE80]">{selectedJob.realisation_progress_percent}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1A2230] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${selectedJob.realisation_progress_percent}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#7A8EA8]">Time Consumption</span>
                        <span className={`font-bold ${selectedJob.time_consumption_percent > 100 ? 'text-orange-500' : 'text-blue-400'}`}>
                          {selectedJob.time_consumption_percent}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1A2230] rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${selectedJob.time_consumption_percent > 100 ? 'bg-orange-500' : 'bg-blue-400'}`}
                          style={{ width: `${Math.min(100, selectedJob.time_consumption_percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-[#1A2230] border border-[#1E2A38] rounded-md p-2">
                        <div className="text-[9px] text-[#3F5270] uppercase tracking-wider mb-1">Actual Hours</div>
                        <div className="text-[11px] font-semibold font-mono text-[#E8EDF5]">{selectedJob.realisation_time_hours}h</div>
                    </div>
                    <div className="bg-[#1A2230] border border-[#1E2A38] rounded-md p-2">
                        <div className="text-[9px] text-[#3F5270] uppercase tracking-wider mb-1">Planned Hours</div>
                        <div className="text-[11px] font-semibold font-mono text-[#E8EDF5]">{selectedJob.estimated_hours}h</div>
                    </div>
                  </div>
                </div>

                {/* Technical Specs */}
                <div className="p-4 border-b border-[#1E2A38]">
                  <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase mb-3">Technical Data</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Part Number", selectedJob.part_number],
                      ["Quality State", selectedJob.quality_status],
                      ["Rework Count", selectedJob.rework_count],
                      ["ERP Status", selectedJob.computed_status],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#1A2230] border border-[#1E2A38] rounded-md p-2">
                        <div className="text-[9px] text-[#3F5270] uppercase tracking-wider mb-1">{label}</div>
                        <div className="text-[11px] font-semibold font-mono">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer */}
                <div className="p-4 border-b border-[#1E2A38]">
                  <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase mb-3">Customer Details</div>
                  <div className="bg-[#1A2230] border border-[#1E2A38] rounded-lg p-3 flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                      style={{ background: COLORS.accentDim, border: `1px solid ${COLORS.accent}30` }}
                    >
                      <Building2 size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">BOEING</div>
                      <div className="text-[11px] text-[#7A8EA8]">Contract: BOE-2026-001</div>
                      <div className="text-[11px] text-[#3F5270] flex items-center gap-1">
                        <MapPin size={10} />
                        <span>Hangar 4, Zone B</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="p-4 border-b border-[#1E2A38]">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase">Production Progress</div>
                    <span className="text-[13px] font-bold text-[#4ADE80]">
                      {selectedJob.status === 'complete' ? '100%' : selectedJob.status === 'active' ? '65%' : '12%'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1A2230] rounded-full overflow-hidden mb-3">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: selectedJob.status === 'complete' ? '100%' : selectedJob.status === 'active' ? '65%' : '12%' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${COLORS.active.dot}, ${COLORS.accent})` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    {["Primary", "Secondary", "Riveting", "Inspection"].map((s, i) => {
                      const isDone = (selectedJob.status === 'complete') || (selectedJob.status === 'active' && i < 2);
                      return (
                        <div key={s} className="flex flex-col items-center gap-1">
                          <div 
                            className={`w-2 h-2 rounded-full border border-[#253345] ${isDone ? 'bg-[#22C55E]' : 'bg-[#212C3D]'}`} 
                          />
                          <span className={`text-[9px] ${isDone ? 'text-[#4ADE80]' : 'text-[#3F5270]'}`}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assignments */}
                <div className="p-4 flex-1">
                  <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase mb-3">Assignments</div>
                  <div className="bg-[#1A2230] border border-[#1E2A38] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[12px] font-mono">{selectedJob.label}</div>
                      <div className="text-[10px] text-[#3F5270]">Assigned to {selectedJob.assignee}</div>
                    </div>
                    <StatusBadge status={selectedJob.status} />
                  </div>
                </div>

                {/* Log Input */}
                <div className="p-3 border-t border-[#1E2A38] bg-[#0E1218]">
                  <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase mb-2">Log Activity</div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Update status..."
                      className="flex-1 bg-[#1A2230] border border-[#253345] rounded-md px-3 py-1.5 text-[12px] focus:outline-none focus:border-[#3B82F6] transition-colors"
                    />
                    <button className="w-8 h-8 flex items-center justify-center rounded-md bg-[#3B82F6] text-white hover:bg-blue-600 transition-colors cursor-pointer">
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Add Modal Overlay */}
        <AnimatePresence>
          {isAddModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0E1218] border border-[#1E2A38] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-4 border-b border-[#1E2A38] flex justify-between items-center bg-[#131920]">
                  <h3 className="font-bold text-[#E8EDF5]">Create New Job</h3>
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-1 rounded-md text-[#7A8EA8] hover:text-[#E8EDF5] hover:bg-[#212C3D] transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#7A8EA8] uppercase tracking-wider mb-1.5">Job Label</label>
                    <input type="text" placeholder="e.g. Job 110000021 · Step 1" className="w-full bg-[#080B0F] border border-[#253345] rounded-md px-3 py-2 text-[13px] text-[#E8EDF5] focus:outline-none focus:border-[#3B82F6]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#7A8EA8] uppercase tracking-wider mb-1.5">Part Number</label>
                      <input type="text" placeholder="e.g. PN-FUS-2" className="w-full bg-[#080B0F] border border-[#253345] rounded-md px-3 py-2 text-[13px] text-[#E8EDF5] focus:outline-none focus:border-[#3B82F6]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#7A8EA8] uppercase tracking-wider mb-1.5">Assignee</label>
                      <input type="text" placeholder="Initials (e.g. JD)" className="w-full bg-[#080B0F] border border-[#253345] rounded-md px-3 py-2 text-[13px] text-[#E8EDF5] focus:outline-none focus:border-[#3B82F6]" />
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-[#1E2A38] flex justify-end gap-2 bg-[#131920]">
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-md text-[12px] font-semibold text-[#7A8EA8] hover:text-[#E8EDF5] hover:bg-[#212C3D] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-md text-[12px] font-semibold bg-[#3B82F6] text-white hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    Create Job
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <HeliosImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
        <MappingAdminModal isOpen={isMappingOpen} onClose={() => setIsMappingOpen(false)} />
      </main>
    </div>
  );
}
