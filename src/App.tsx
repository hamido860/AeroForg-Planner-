import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  LayoutDashboard, 
  Kanban,
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
  Hash,
  Send,
  Menu,
  Settings,
  LogOut,
  ChevronDown,
  UserCircle,
  Shield,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import HeliosImportModal from "./components/HeliosImportModal";
import MappingAdminModal from "./components/MappingAdminModal";
import UsersAdminModal from "./components/UsersAdminModal";
import DatabaseExplorerModal from "./components/DatabaseExplorerModal";
import { HeliosOrder, AppUser, EnrichedOrder, SchedulerJob } from "./domain/interfaces";

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

const statusConfig: Record<string, { bg: string, border: string, text: string, dot: string }> = {
  BLOCKED: { bg: "#3D1A1A", border: "#C2410C", text: "#ef4444", dot: "#ef4444" },
  WAITING_MATERIAL: { bg: "#3D2E0A", border: "#B45309", text: "#f97316", dot: "#f97316" }, 
  IN_PROGRESS: { bg: "#0F3320", border: "#16A34A", text: "#4ADE80", dot: "#22C55E" },
  SCHEDULED: { bg: "#1A3A5C", border: "#2563EB", text: "#60A5FA", dot: "#3B82F6" },
  FINISH: { bg: "#1A2E1A", border: "#15803D", text: "#86EFAC", dot: "#4ADE80" },
  OVER_TIME: { bg: "#3D1A0A", border: "#C2410C", text: "#f97316", dot: "#f97316" },
  LATE: { bg: "#3D1A0A", border: "#C2410C", text: "#ef4444", dot: "#ef4444" },
  OPEN: { bg: "#1A3A5C", border: "#2563EB", text: "#60A5FA", dot: "#3B82F6" },
  DRAFT: { bg: "#253345", border: "#3F5270", text: "#A0AEC0", dot: "#7A8EA8" },
  READY_TO_SCHEDULE: { bg: "#3D2E0A", border: "#B45309", text: "#FCD34D", dot: "#F59E0B" },
  IMPORTED: { bg: "#1A2230", border: "#1E2A38", text: "#7A8EA8", dot: "#3F5270" }
};

const days = ["Mon 23", "Tue 24", "Wed 25", "Thu 26", "Fri 27"];
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

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

const getMsPerPixel = (viewMode: string): number => {
  if (viewMode === "Day") {
    // 1152px / 24 segments => 48px/hour. 1hr = 3600000ms. 3600000 / 48 = 75000 ms/px.
    return 75000;
  } else if (viewMode === "Week") {
    // 900px / 5 segments => 180px/day. 1d = 86400000ms. 86400000 / 180 = 480000 ms/px.
    return 480000;
  } else {
    // Month: 900px / 30 segments => 30px/day. 1d = 86400000ms. 86400000 / 30 = 2880000 ms/px.
    return 2880000;
  }
};

const GanttBar = ({ 
  order, 
  onClick, 
  selected, 
  segmentWidth, 
  viewMode,
  isDragging,
  dragOffsetMs,
  onDragStart
}: { 
  order: SchedulerJob; 
  onClick: (o: SchedulerJob) => void; 
  selected: boolean; 
  segmentWidth: number; 
  viewMode: string;
  isDragging: boolean;
  dragOffsetMs: number;
  onDragStart: (orderId: string, originalStart: string, originalEnd: string, clientX: number) => void;
}) => {
  let displayStatus = order.job_status || "OPEN";
  if (order.material_risk === "PARTIAL" || order.material_risk === "MISSING") displayStatus = "WAITING_MATERIAL";
  if (order.planning_risk === "HIGH") displayStatus = "BLOCKED";
  
  const cfg = statusConfig[displayStatus] || statusConfig.OPEN;
  
  const startDate = order.scheduled_start_at || order.planned_start_at;
  const endDate = order.scheduled_end_at || order.planned_end_at;
  
  if (!startDate || !endDate) return null; // Fallback to unseen 

  let dStart = new Date(startDate).getTime();
  let dEnd = new Date(endDate).getTime();

  if (isDragging) {
    dStart += dragOffsetMs;
    dEnd += dragOffsetMs;
  }

  const msPerDay = 1000 * 60 * 60 * 24;

  let col = 0;
  if (viewMode === "Month") {
    // Treat as May 2026 roughly. May 1st is base.
    col = Math.max(0, (dStart - new Date("2026-05-01T00:00:00Z").getTime()) / msPerDay);
  } else if (viewMode === "Week") {
    // Treat as May 18th week roughly.
    col = Math.max(0, (dStart - new Date("2026-05-18T00:00:00Z").getTime()) / msPerDay);
  } else {
    // Day: hours. Let's say relative to same day 00:00
    const d = new Date(dStart);
    col = d.getHours() + d.getMinutes() / 60;
  }

  const durationHours = Math.max(1, (dEnd - dStart) / (1000 * 60 * 60));
  let span = durationHours / 24; // in days
  if (viewMode === "Day") {
    span = durationHours;
  }
  
  span = Math.max(0.5, span); // Minimum width

  const left = `${col * segmentWidth}%`;
  const width = `${span * segmentWidth - 0.2}%`;
  
  return (
    <motion.div
      layoutId={order.id}
      onMouseDown={(e) => {
        // Only left click drags
        if (e.button !== 0) return;
        e.stopPropagation();
        onClick(order); // Match click selection on start
        onDragStart(order.id, startDate, endDate, e.clientX);
      }}
      className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md flex items-center px-1.5 gap-1 select-none overflow-hidden z-10 transition-shadow"
      style={{
        left, width,
        background: cfg.bg,
        border: `1.5px solid ${selected || isDragging ? cfg.text : cfg.border}`,
        boxShadow: isDragging 
          ? `0 0 12px ${cfg.text}80` 
          : selected 
            ? `0 0 0 2px ${cfg.border}40` 
            : "none",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.8 : 1,
      }}
      whileHover={{ scale: isDragging ? 1 : 1.02, zIndex: 20 }}
      whileTap={{ scale: isDragging ? 1 : 0.98 }}
      title={`${order.erp_order_id} · ${order.designation}`}
    >
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      <span 
        className="text-[10px] font-medium truncate font-sans leading-none flex gap-1 items-center"
        style={{ color: cfg.text }}
      >
        {order.erp_order_id} 
        <span className="opacity-60 ml-0.5">•</span> 
        <span className="truncate max-w-[100px]">{order.assigned_team_name || 'Unassigned'}</span>
        <span className="opacity-60 ml-0.5 font-mono">{order.realisation_progress_percent || 0}%</span>
      </span>
    </motion.div>
  );
};

export default function AeroForgPlanner() {
  const [orders, setOrders] = React.useState<SchedulerJob[]>([]);
  const [reviewQueue, setReviewQueue] = React.useState<any[]>([]);
  const [plannerJobs, setPlannerJobs] = React.useState<any[]>([]);
  const [appUsers, setAppUsers] = React.useState<AppUser[]>([]);
  const [teams, setTeams] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<AppUser | null>(null);
  const [selectedJob, setSelectedJob] = useState<SchedulerJob | null>(null);
  const [activeJobId, setActiveJobId] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [viewMode, setViewMode] = useState("Week");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMiniSidebar, setIsMiniSidebar] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const [draggedJob, setDraggedJob] = useState<{
    id: string;
    originalStart: string;
    originalEnd: string;
  } | null>(null);
  const [draggedOffsetMs, setDraggedOffsetMs] = useState<number>(0);
  const dragStartXRef = useRef<number>(0);

  useEffect(() => {
    if (!draggedJob) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartXRef.current;
      const msPerPx = getMsPerPixel(viewMode);
      setDraggedOffsetMs(dx * msPerPx);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const dx = e.clientX - dragStartXRef.current;
      const msPerPx = getMsPerPixel(viewMode);
      const finalOffset = dx * msPerPx;

      if (Math.abs(dx) > 4) {
        const startMs = new Date(draggedJob.originalStart).getTime() + finalOffset;
        const endMs = new Date(draggedJob.originalEnd).getTime() + finalOffset;

        // Proactively transition job_status if it is currently in DRAFT or READY_TO_SCHEDULE
        const origJob = orders.find(j => j.id === draggedJob.id);
        const payload: any = {
          scheduled_start_at: new Date(startMs).toISOString(),
          scheduled_end_at: new Date(endMs).toISOString()
        };
        if (origJob && (origJob.job_status === 'DRAFT' || origJob.job_status === 'READY_TO_SCHEDULE')) {
          payload.job_status = 'SCHEDULED';
        }

        fetch(`/api/planning/jobs/${draggedJob.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(() => {
          fetchData();
        });
      }

      setDraggedJob(null);
      setDraggedOffsetMs(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedJob, viewMode, orders]);

  const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (rightScrollRef.current && rightScrollRef.current.scrollTop !== e.currentTarget.scrollTop) {
      rightScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };
  const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (leftScrollRef.current && leftScrollRef.current.scrollTop !== e.currentTarget.scrollTop) {
      leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isDatabaseExplorerOpen, setIsDatabaseExplorerOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Scheduler");
  const [showUnscheduled, setShowUnscheduled] = useState(true);

  const fetchData = () => {
    fetch("/api/scheduler/jobs")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mappedJobs: SchedulerJob[] = data.map((o: any) => ({
            id: o.id,
            planning_job_code: o.planning_job_code,
            helios_order_id: o.helios_order_id,
            erp_order_id: o.heliosOrder?.erp_order_id || "Unknown",
            designation: o.heliosOrder?.designation || "Assembly Task",
            part_reference: o.heliosOrder?.part_reference || "UNK",
            aircraft_zone: o.heliosOrder?.aircraft_zone || "Z1",
            work_center_code: o.heliosOrder?.work_center_code || "WC1",
            quantity: o.heliosOrder?.quantity || 1,
            estimated_load_hours: o.heliosOrder?.estimated_load_hours || 0,
            planned_start_at: o.heliosOrder?.planned_start_at || o.planning_start_at,
            planned_end_at: o.heliosOrder?.planned_end_at || o.planning_end_at,
            scheduled_start_at: o.scheduled_start_at,
            scheduled_end_at: o.scheduled_end_at,
            assigned_team_id: o.assigned_team_id,
            assigned_team_name: null,
            material_risk: o.material_risk || "NONE",
            planning_risk: o.planning_risk || "LOW",
            job_status: o.job_status,
            realisation_time_hours: o.realisation_time_hours || 0,
            realisation_progress_percent: o.realisation_progress_percent || 0,
            time_consumption_percent: o.time_consumption_percent || 0,
            quality_status: o.quality_status || "OPEN",
            rework_count: o.rework_count || 0
          }));
          setOrders(mappedJobs);
          setSelectedJob(prev => {
            if (!prev) return mappedJobs[0] || null;
            const updated = mappedJobs.find(x => x.id === prev.id);
            if (updated) return { ...prev, ...updated };
            return prev;
          });
        }
      });

    fetch("/api/helios/review-queue")
       .then(res => res.json())
       .then(data => {
         if (Array.isArray(data)) setReviewQueue(data);
       });
       
    fetch("/api/planning/jobs")
       .then(res => res.json())
       .then(data => {
         if (Array.isArray(data)) {
           setPlannerJobs(data);
           setSelectedJob(prev => {
             if (!prev) return null;
             const found = data.find((x: any) => x.id === prev.id);
             if (found) {
               return {
                 ...prev,
                 ...found,
                 job_status: found.job_status,
                 assigned_team_id: found.assigned_team_id
               };
             }
             return prev;
           });
         }
       });
  };

  React.useEffect(() => {
    fetchData();

    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAppUsers(data);
      });

    fetch("/api/teams")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeams(data);
      });

    fetch("/api/users/current")
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setCurrentUser(data);
      });
  }, []);

  const handleUserSwitch = (userId: string) => {
    fetch("/api/users/current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    }).then(() => {
      fetch("/api/users/current")
        .then(res => res.json())
        .then(data => {
          setCurrentUser(data);
          setIsUserSwitcherOpen(false);
        });
    });
  };

  const timelineSegments = useMemo(() => {
    if (viewMode === "Day") return hours;
    if (viewMode === "Month") return Array.from({ length: 30 }, (_, i) => `${i + 1}`);
    return days;
  }, [viewMode]);

  const segmentWidth = useMemo(() => 100 / timelineSegments.length, [timelineSegments]);

  const rawOrders = Array.isArray(orders) ? orders : [];
  const unscheduledCount = rawOrders.filter(o => !o.scheduled_start_at).length;

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    statut: "All",
    risk: "All",
    prog: "All",
    sprc: "All",
    op: "All"
  });

  const [plannerFilters, setPlannerFilters] = useState<Record<string, string>>({
    stat: "All",
    prog: "All",
    sprc: "All",
    op: "All"
  });

  const filteredOrders = useMemo(() => {
    let baseOrders = rawOrders;
    if (!showUnscheduled) {
      baseOrders = baseOrders.filter(o => o.scheduled_start_at);
    }

    if (columnFilters.prog !== "All") {
      baseOrders = baseOrders.filter(o => {
        let raw: any = {};
        if (o.raw_helios_row) {
          try { raw = JSON.parse(o.raw_helios_row); } catch(e){}
        }
        return (raw.EAP || o.work_center_code) === columnFilters.prog;
      });
    }

    if (columnFilters.sprc !== "All") {
      baseOrders = baseOrders.filter(o => {
        let raw: any = {};
        if (o.raw_helios_row) {
          try { raw = JSON.parse(o.raw_helios_row); } catch(e){}
        }
        return (o.aircraft_zone || raw["3523"]) === columnFilters.sprc;
      });
    }

    if (columnFilters.op !== "All") {
      baseOrders = baseOrders.filter(o => {
        let raw: any = {};
        if (o.raw_helios_row) {
          try { raw = JSON.parse(o.raw_helios_row); } catch(e){}
        }
        const op = raw.Operateur || 'Unassigned';
        return op === columnFilters.op;
      });
    }
    
    // Apply column filters
    if (columnFilters.statut !== "All") {
      baseOrders = baseOrders.filter(o => {
        let raw: any = {};
        if (o.raw_helios_row) {
          try { raw = JSON.parse(o.raw_helios_row); } catch (e) {}
        }
        const status = raw.STATUT || o.job_status || "";
        if (columnFilters.statut === "PROG") {
           return status === "IN_PROGRESS" || o.job_status === "IN_PROGRESS" || status === "PROG";
        }
        return status === columnFilters.statut;
      });
    }

    if (columnFilters.risk !== "All") {
      baseOrders = baseOrders.filter(o => {
        if (columnFilters.risk === "Material Missing") return o.material_risk === "MISSING";
        if (columnFilters.risk === "Late") return o.planning_risk === "HIGH" || o.planning_risk === "CRITICAL";
        if (columnFilters.risk === "Unassigned") return !o.assigned_team_name;
        return true;
      });
    }

    if (!searchVal) return baseOrders;
    const lowerSearch = searchVal.toLowerCase();
    
    return baseOrders.filter(o => {
      let rawText = "";
      if (o.raw_helios_row) {
         try {
           const parsed = JSON.parse(o.raw_helios_row);
           rawText = Object.values(parsed).join(" ").toLowerCase();
         } catch(e) {}
      }
      return (
        o.planning_job_code?.toLowerCase().includes(lowerSearch) || 
        o.part_reference?.toLowerCase().includes(lowerSearch) ||
        o.designation?.toLowerCase().includes(lowerSearch) ||
        o.erp_order_id?.toLowerCase().includes(lowerSearch) ||
        rawText.includes(lowerSearch)
      );
    });
  }, [searchVal, rawOrders, showUnscheduled, columnFilters]);

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
                { icon: LayoutDashboard, label: "Dashboard", onClick: () => setActiveTab("Dashboard") },
                { icon: Package, label: "Helios Queue", onClick: () => setActiveTab("HeliosQueue") },
                { icon: Kanban, label: "Planner", onClick: () => setActiveTab("Planner") },
                { icon: Calendar, label: "Scheduler", onClick: () => setActiveTab("Scheduler") },
                { icon: Users, label: "Resources", onClick: () => setActiveTab("Resources") },
                { icon: Database, label: "Database", onClick: () => setIsDatabaseExplorerOpen(true) },
                { icon: Shield, label: "Permissions", onClick: () => setIsUsersOpen(true) },
                { icon: Settings, label: "Settings", onClick: () => setIsMappingOpen(true) },
              ].map(({ icon: Icon, label, onClick }) => {
                const active = activeTab === (label === "Helios Queue" ? "HeliosQueue" : label);
                return (
                <div 
                  key={label} 
                  onClick={onClick}
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
              )})}

              {/* Metric Legend */}
              {!isMiniSidebar && (
                <div className="mx-2 mt-4 space-y-4">
                  {/* View Mode & Search for Scheduler */}
                  {activeTab === "Scheduler" && (
                    <div className="space-y-4">
                      {/* View Mode */}
                      <div className="p-3 bg-[#080B0F] border border-[#1E2A38] rounded-lg">
                        <div className="text-[10px] font-bold text-[#E8EDF5] uppercase tracking-widest mb-3">View Mode</div>
                        <div className="flex bg-[#131920] rounded-md p-0.5 border border-[#1E2A38]">
                          {["Day", "Week", "Month"].map(v => (
                            <button 
                              key={v} 
                              onClick={() => setViewMode(v)}
                              className={`flex-1 px-2 py-1 rounded-[4px] text-[11px] cursor-pointer transition-all ${
                                v === viewMode ? 'bg-[#3B82F6] text-white font-semibold shadow-sm' : 'text-[#7A8EA8] hover:text-[#E8EDF5]'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Legend */}
                  {activeTab === "Scheduler" && (
                    <div className="p-3 bg-[#080B0F] border border-[#1E2A38] rounded-lg">
                      <div className="text-[10px] font-bold text-[#E8EDF5] uppercase tracking-widest mb-3">Status Legend</div>
                      <div className="space-y-2">
                        {[
                          { label: "BLOCKED", cfg: statusConfig.BLOCKED },
                          { label: "WAITING MAT", cfg: statusConfig.WAITING_MATERIAL },
                          { label: "IN PROGRESS", cfg: statusConfig.IN_PROGRESS },
                          { label: "SCHEDULED", cfg: statusConfig.SCHEDULED },
                        ].map(({ label, cfg }) => (
                          <div key={label} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot || "#ccc" }} />
                            <span className="text-[10px] font-bold tracking-wider" style={{ color: cfg.text || "#ccc" }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                </div>
              )}
            </nav>

            {/* User Profile */}
            <div className="relative p-3 border-t border-[#1E2A38] bg-[#080B0F]/50">
              <div 
                onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
                className={`flex items-center ${isMiniSidebar ? 'justify-center p-1' : 'justify-between p-2'} rounded-md hover:bg-[#212C3D] cursor-pointer transition-all duration-300 overflow-hidden w-full`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Avatar initials={currentUser?.full_name?.split(' ').map(n=>n[0]).join('') || "?"} size={32} />
                  <AnimatePresence>
                    {!isMiniSidebar && (
                      <motion.div 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="text-[12px] font-semibold text-[#E8EDF5] truncate whitespace-nowrap">{currentUser?.full_name || "Unknown"}</div>
                        <div className="text-[10px] text-[#7A8EA8] truncate whitespace-nowrap uppercase font-bold">{currentUser?.role || "Role"}</div>
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
                      <ChevronDown size={14} className={`text-[#7A8EA8] shrink-0 transition-transform ${isUserSwitcherOpen ? 'rotate-180' : ''}`} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Switcher Menu */}
              <AnimatePresence>
                {isUserSwitcherOpen && !isMiniSidebar && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-2 right-2 mb-2 bg-[#1A2230] border border-[#253345] rounded-lg shadow-2xl overflow-hidden z-[100]"
                  >
                    <div className="p-2 border-b border-[#253345] bg-[#131920]">
                      <div className="text-[9px] font-bold text-[#3F5270] uppercase tracking-wider">Switch Active Role</div>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto p-1 py-1.5 space-y-0.5 custom-scrollbar">
                      {appUsers.map(u => (
                        <div
                          key={u.id}
                          onClick={() => handleUserSwitch(u.id)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all hover:bg-blue-500/10 group ${currentUser?.id === u.id ? 'bg-blue-500/20' : ''}`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <Avatar initials={u.full_name.split(' ').map(n=>n[0]).join('')} size={24} />
                            <div className="overflow-hidden">
                              <div className={`text-[11px] font-medium leading-none ${currentUser?.id === u.id ? 'text-blue-400' : 'text-[#E8EDF5]'}`}>{u.full_name}</div>
                              <div className="text-[8px] text-[#7A8EA8] mt-0.5 font-bold uppercase">{u.role}</div>
                            </div>
                          </div>
                          {currentUser?.id === u.id && <div className="w-1 h-1 rounded-full bg-blue-500" />}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#131920] relative">
        {/* Top bar */}
        <header className="h-[59px] flex items-center justify-between px-4 md:px-5 border-b border-[#1E2A38] bg-[#0E1218]">
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-md text-[#7A8EA8] hover:text-[#E8EDF5] hover:bg-[#212C3D] transition-colors md:hidden shrink-0"
              >
                <Menu size={18} />
              </button>
            )}
            <div className="flex flex-col">
              <h2 className="text-[14px] md:text-[15px] font-bold truncate">
                {activeTab === "Scheduler" && "Helios Flight Line Schedule"}
                {activeTab === "HeliosQueue" && "Helios Review Queue"}
                {activeTab === "Planner" && "Planner Board"}
                {activeTab === "Dashboard" && "Dashboard"}
                {activeTab === "Resources" && "Resources"}
              </h2>
              {activeTab === "Scheduler" && (
                <span className="text-[10px] text-[#7A8EA8] tracking-wide">ERP execution timeline from Helios production data</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {/* Import */}

            {(activeTab === "Scheduler" || activeTab === "HeliosQueue" || activeTab === "Planner") && (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[12px] bg-[#3B82F6] border border-[#3B82F6] text-white hover:bg-blue-600 transition-all cursor-pointer"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Import</span>
            </motion.button>
            )}
            
            {/* Export */}
            {activeTab === "Scheduler" && (
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
            )}
          </div>
        </header>

        {activeTab === "HeliosQueue" && (
          <div className="p-6 h-full overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Pending ERP Orders</h3>
            <div className="bg-[#0E1218] border border-[#1E2A38] rounded-xl overflow-hidden shadow-sm">
               {reviewQueue.length === 0 ? (
                 <div className="p-12 text-center text-[#7A8EA8]">
                    <Package size={32} className="mx-auto mb-4 opacity-50" />
                    <div>No pending orders in the queue.</div>
                    <p className="text-[11px] mt-2">All imported ERP orders have been assigned to Planning Jobs.</p>
                 </div>
               ) : (
                 <table className="w-full text-left text-sm">
                   <thead className="bg-[#1A2230] text-[#7A8EA8] text-[11px] uppercase tracking-wider">
                     <tr>
                       <th className="px-4 py-3 font-semibold">ERP Order ID</th>
                       <th className="px-4 py-3 font-semibold">Part Ref & Desig</th>
                       <th className="px-4 py-3 font-semibold">Zone / Center</th>
                       <th className="px-4 py-3 font-semibold">Qty</th>
                       <th className="px-4 py-3 font-semibold">Hrs</th>
                       <th className="px-4 py-3 font-semibold text-right">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#1E2A38]">
                     {reviewQueue.map(order => (
                       <tr key={order.id} className="hover:bg-[#1A2230] transition-colors">
                         <td className="px-4 py-3 font-mono text-[13px]">{order.erp_order_id}</td>
                         <td className="px-4 py-3">
                           <div className="font-semibold text-[#E8EDF5]">{order.part_reference}</div>
                           <div className="text-[11px] text-[#7A8EA8]">{order.designation}</div>
                         </td>
                         <td className="px-4 py-3">
                           <div className="text-[#E8EDF5] text-[12px]">{order.aircraft_zone}</div>
                           <div className="text-[11px] text-[#7A8EA8]">{order.work_center_code}</div>
                         </td>
                         <td className="px-4 py-3 text-[13px]">{order.quantity}</td>
                         <td className="px-4 py-3 text-[13px]">{order.estimated_load_hours}h</td>
                         <td className="px-4 py-3 text-right">
                           <button 
                             onClick={() => {
                               fetch(`/api/planning/jobs/from-helios/${order.id}`, {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ userId: currentUser?.id })
                               }).then(() => fetchData())
                             }}
                             className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-[11px] font-bold rounded"
                           >
                             Create Job
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
            </div>
          </div>
        )}

        {activeTab === "Planner" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-2 bg-[#0E1218] border-b border-[#1E2A38] flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 <div className="relative">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3F5270]" />
                   <input 
                     type="text" 
                     placeholder="Search planning jobs..."
                     className="bg-[#131920] border border-[#1E2A38] rounded-md pl-9 pr-3 py-1.5 text-[11px] w-[260px] focus:outline-none focus:border-[#3B82F6] transition-colors"
                     value={searchVal}
                     onChange={(e) => setSearchVal(e.target.value)}
                   />
                 </div>
                 <div className="h-4 w-px bg-[#1E2A38]" />
                 <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[#7A8EA8]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#E8EDF5]">{plannerJobs.length}</span>
                      <span>Total Jobs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500">{plannerJobs.filter(j => j.job_status === 'READY_TO_SCHEDULE').length}</span>
                      <span>Ready</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#3F5270]">{plannerJobs.filter(j => j.job_status === 'DRAFT').length}</span>
                      <span>Drafts</span>
                    </div>
                 </div>
               </div>
               
               <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded bg-[#1A2230] border border-[#253345] text-[#7A8EA8] hover:text-[#E8EDF5] transition-colors">
                    <Download size={14} />
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto w-full">
              <div className="min-w-fit w-max flex flex-col">
                <div className="flex bg-[#0E1218] border-b border-[#1E2A38] sticky top-0 z-40 shadow-xl h-[32.2812px] min-w-max">
                  <table className="w-auto text-left border-collapse text-[10px] whitespace-nowrap min-w-max">
                    <thead className="bg-[#0E1218] text-[11px] font-bold text-[#7A8EA8] uppercase tracking-widest text-left h-[32.2812px]">
                      <tr>
                    <th className="px-2 border-r border-[#1E2A38] h-full bg-[#0E1218] max-w-[150px] font-normal truncate">
                      <select
                        className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                        value={plannerFilters.prog}
                        onChange={(e) => setPlannerFilters(prev => ({ ...prev, prog: e.target.value }))}
                      >
                        <option value="All">PROG</option>
                        {Array.from(new Set(plannerJobs.map(j => {
                          let r: any = {};
                          if (j.heliosOrder?.raw_helios_row) {
                            try { r = JSON.parse(j.heliosOrder.raw_helios_row); } catch(e){}
                          }
                          return r.EAP || j.heliosOrder?.work_center_code || '—';
                        }))).filter(Boolean).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-2 border-r border-[#1E2A38] h-full bg-[#0E1218] max-w-[150px] font-normal truncate">
                      <select
                        className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                        value={plannerFilters.sprc}
                        onChange={(e) => setPlannerFilters(prev => ({ ...prev, sprc: e.target.value }))}
                      >
                        <option value="All">S PROG</option>
                        {Array.from(new Set(plannerJobs.map(j => {
                          let r: any = {};
                          if (j.heliosOrder?.raw_helios_row) {
                            try { r = JSON.parse(j.heliosOrder.raw_helios_row); } catch(e){}
                          }
                          return j.heliosOrder?.aircraft_zone || r["3523"] || '—';
                        }))).filter(Boolean).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-2 border-r border-[#1E2A38] h-full bg-[#0E1218] max-w-[150px] font-normal truncate">
                      <select
                        className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                        value={plannerFilters.op}
                        onChange={(e) => setPlannerFilters(prev => ({ ...prev, op: e.target.value }))}
                      >
                        <option value="All">OP</option>
                        <option value="Unassigned">Unassigned</option>
                        {Array.from(new Set(plannerJobs.map(j => {
                          let r: any = {};
                          if (j.heliosOrder?.raw_helios_row) {
                            try { r = JSON.parse(j.heliosOrder.raw_helios_row); } catch(e){}
                          }
                          return r.Operateur;
                        }))).filter(v => v && v !== 'Unassigned').map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-2 border-r border-[#1E2A38] h-full flex items-center font-normal text-[#E8EDF5]">
                      <select
                        className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                        value={plannerFilters.ofH || "All"}
                        onChange={(e) => setPlannerFilters(prev => ({ ...prev, ofH: e.target.value }))}
                      >
                        <option value="All">OF H</option>
                        {Array.from(new Set(plannerJobs.map(j => {
                          let r: any = {};
                          if (j.heliosOrder?.raw_helios_row) {
                            try { r = JSON.parse(j.heliosOrder.raw_helios_row); } catch(e){}
                          }
                          return r["OF HELIOS"] || j.planning_job_code;
                        }))).filter(Boolean).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">OF SAP</th>
                    <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5] min-w-[200px]">DESIG</th>
                    <th className="px-2 border-r border-[#1E2A38] h-full bg-[#0E1218] font-normal truncate">
                      <select
                        className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                        value={plannerFilters.stat}
                        onChange={(e) => setPlannerFilters(prev => ({ ...prev, stat: e.target.value }))}
                      >
                        <option value="All">STAT</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="READY_TO_SCHEDULE">READY</option>
                        <option value="SCHEDULED">SCHED</option>
                        <option value="IN_PROGRESS">PROG</option>
                        <option value="FINISH">FINISH</option>
                      </select>
                    </th>
                    <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">
                      <select
                        className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                        value={plannerFilters.du || "All"}
                        onChange={(e) => setPlannerFilters(prev => ({ ...prev, du: e.target.value }))}
                      >
                        <option value="All">DU</option>
                        <option value="Late">LAT</option>
                      </select>
                    </th>
                    <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">REA</th>
                    <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">
                      <select
                        className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                        value={plannerFilters.qua || "All"}
                        onChange={(e) => setPlannerFilters(prev => ({ ...prev, qua: e.target.value }))}
                      >
                        <option value="All">QUA</option>
                        <option value="OPEN">OPEN</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </th>
                    <th className="px-2 h-full align-middle font-normal text-[#E8EDF5]">OO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2A38]">
                    {plannerJobs
                      .filter(job => {
                        const search = searchVal.toLowerCase();
                        let matchesSearch = true;
                        if (search) {
                          matchesSearch = (
                            job.planning_job_code?.toLowerCase().includes(search) ||
                            job.heliosOrder?.erp_order_id?.toLowerCase().includes(search) ||
                            job.heliosOrder?.part_reference?.toLowerCase().includes(search) ||
                            job.heliosOrder?.designation?.toLowerCase().includes(search)
                          );
                        }
                        
                        let matchesFilters = true;
                        if (plannerFilters.stat !== "All") {
                           if (job.job_status !== plannerFilters.stat) matchesFilters = false;
                        }
                        
                        const hOrder = job.heliosOrder || {};
                        let raw: any = {};
                        if (hOrder.raw_helios_row) {
                          try { raw = JSON.parse(hOrder.raw_helios_row); } catch(e) {}
                        }
                        const eap = raw.EAP || hOrder.work_center_code || '—';
                        const type3523 = hOrder.aircraft_zone || raw["3523"] || '—';
                        const operator = raw.Operateur || 'Unassigned';
                        const ofH = raw["OF HELIOS"] || job.planning_job_code;
                        const qua = raw.QUA || hOrder.quality_status || 'OPEN';

                        if (plannerFilters.prog !== "All" && eap !== plannerFilters.prog) matchesFilters = false;
                        if (plannerFilters.sprc !== "All" && type3523 !== plannerFilters.sprc) matchesFilters = false;
                        if (plannerFilters.op !== "All" && operator !== plannerFilters.op) matchesFilters = false;
                        if (plannerFilters.ofH && plannerFilters.ofH !== "All" && ofH !== plannerFilters.ofH) matchesFilters = false;
                        if (plannerFilters.qua && plannerFilters.qua !== "All" && qua !== plannerFilters.qua) matchesFilters = false;
                        if (plannerFilters.du === "Late") {
                           // Late dummy heuristic
                           if (hOrder.planning_risk !== "HIGH" && hOrder.planning_risk !== "CRITICAL") matchesFilters = false;
                        }

                        return matchesSearch && matchesFilters;
                      })
                      .map((job, idx) => {
                        const hOrder = job.heliosOrder || {};
                        let raw: any = {};
                        if (hOrder.raw_helios_row) {
                          try { raw = JSON.parse(hOrder.raw_helios_row); } catch(e) {}
                        }

                        const eap = raw.EAP || hOrder.work_center_code || '—';
                        const type3523 = hOrder.aircraft_zone || raw["3523"] || '—';
                        const operator = raw.Operateur || 'Unassigned';
                        const ofHelios = raw["OF HELIOS"] || job.planning_job_code;
                        const erpOf = raw.OF || hOrder.erp_order_id;
                        const designation = raw.Designation || hOrder.designation;
                        const statut = job.job_status;
                        const hours = hOrder.estimated_load_hours || 0;
                        const rea = hOrder.realisation_progress_percent || 0;
                        const qua = raw.QUA || hOrder.quality_status || 'OPEN';

                        return (
                          <tr 
                            key={job.id} 
                            className={`h-[32.2812px] transition-colors group ${
                              idx % 2 === 0 ? 'bg-[#0E1218]' : 'bg-[#131920]'
                            } hover:bg-[#1E2A38]/50`}
                          >
                              <td className="px-2 font-bold text-[#E8EDF5] truncate border-r border-[#1E2A38] max-w-[150px]">{eap}</td>
                              <td className="px-2 text-[#A0AEC0] truncate border-r border-[#1E2A38] max-w-[150px]">{type3523}</td>
                              <td className="px-2 text-[#A0AEC0] truncate uppercase border-r border-[#1E2A38] max-w-[150px]">{operator}</td>
                              <td className="px-2 font-mono text-[#E8EDF5] truncate border-r border-[#1E2A38] max-w-[150px]">{ofHelios}</td>
                              <td className="px-2 font-mono text-[#E8EDF5] truncate border-r border-[#1E2A38] max-w-[150px]">{erpOf}</td>
                              <td className="px-2 text-[#E8EDF5] truncate font-medium border-r border-[#1E2A38] max-w-[300px]" title={designation}>{designation}</td>
                              <td className="px-2 border-r border-[#1E2A38] truncate min-w-[70px]">
                                <select 
                                  value={job.job_status}
                                  onChange={(e) => {
                                    fetch(`/api/planning/jobs/${job.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ job_status: e.target.value })
                                    }).then(() => fetchData())
                                  }}
                                  className={`text-[9px] font-bold tracking-wider rounded px-1.5 py-0.5 outline-none border transition-colors cursor-pointer w-full text-ellipsis overflow-hidden whitespace-nowrap ${
                                    job.job_status === 'READY_TO_SCHEDULE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                                    job.job_status === 'DRAFT' ? 'bg-[#253345] text-[#A0AEC0] border-[#3F5270]' :
                                    'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                  }`}
                                >
                                  <option value="DRAFT" className="bg-[#0E1218] text-[#E8EDF5]">DRAFT</option>
                                  <option value="READY_TO_SCHEDULE" className="bg-[#0E1218] text-[#E8EDF5]">READY</option>
                                  <option value="SCHEDULED" className="bg-[#0E1218] text-[#E8EDF5]">SCHED</option>
                                  <option value="IN_PROGRESS" className="bg-[#0E1218] text-[#E8EDF5]">PROG</option>
                                  <option value="FINISH" className="bg-[#0E1218] text-[#E8EDF5]">FINISH</option>
                                </select>
                              </td>
                              <td className="px-2 text-[#A0AEC0] font-mono truncate border-r border-[#1E2A38] w-[80px]">{hours}h</td>
                              <td className="px-2 text-[#3B82F6] font-mono truncate font-bold border-r border-[#1E2A38] w-[80px]">{rea}%</td>
                              <td className="px-2 font-bold text-[#7A8EA8] truncate border-r border-[#1E2A38] uppercase w-[80px]">{qua.replace(/_/g, " ")}</td>
                              <td className="px-2 text-[#E8EDF5] font-mono truncate w-[80px]">{raw.OO || raw.Oo || raw.oo || ''}</td>
                          </tr>
                        );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Scheduler" && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex overflow-hidden relative">
            {/* Main scheduler container (left pane, right pane, and bottom bar) */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#080B0F]">
              {/* Scheduler Split Pane Layout */}
              <div className="flex-1 flex overflow-hidden min-h-0 relative">
                
                {/* LEFT PANEL */}
              <div 
                className="w-auto max-w-[55vw] shrink-0 flex flex-col bg-[#080B0F] border-r border-[#1E2A38] z-20 overflow-y-auto overflow-x-auto hidden-scrollbar"
                ref={leftScrollRef}
                onScroll={handleLeftScroll}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                  <table className="w-auto text-left border-collapse text-[10px] whitespace-nowrap min-w-max">
                    <thead className="bg-[#0E1218] text-[11px] font-bold text-[#7A8EA8] uppercase tracking-widest text-left h-[32.2812px] shadow-xl sticky top-0 z-30 border-b border-[#1E2A38]">
                      <tr>
                        <th className="px-2 border-r border-[#1E2A38] h-full bg-[#0E1218] max-w-[150px] font-normal truncate">
                          <select
                            className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                            value={columnFilters.prog}
                            onChange={(e) => setColumnFilters(prev => ({ ...prev, prog: e.target.value }))}
                          >
                            <option value="All">PROG</option>
                            {Array.from(new Set(rawOrders.map(o => {
                              let r: any = {};
                              if (o.raw_helios_row) try { r = JSON.parse(o.raw_helios_row); } catch(e){}
                              return r.EAP || o.work_center_code;
                            }))).filter(Boolean).map(v => (
                              <option key={v as string} value={v as string}>{v as string}</option>
                            ))}
                          </select>
                        </th>
                        <th className="px-2 border-r border-[#1E2A38] h-full bg-[#0E1218] max-w-[150px] font-normal truncate">
                          <select
                            className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                            value={columnFilters.sprc}
                            onChange={(e) => setColumnFilters(prev => ({ ...prev, sprc: e.target.value }))}
                          >
                            <option value="All">S PROG</option>
                            {Array.from(new Set(rawOrders.map(o => {
                              let r: any = {};
                              if (o.raw_helios_row) try { r = JSON.parse(o.raw_helios_row); } catch(e){}
                              return o.aircraft_zone || r["3523"];
                            }))).filter(Boolean).map(v => (
                              <option key={v as string} value={v as string}>{v as string}</option>
                            ))}
                          </select>
                        </th>
                        <th className="px-2 border-r border-[#1E2A38] h-full bg-[#0E1218] max-w-[150px] font-normal truncate">
                          <select
                            className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                            value={columnFilters.op}
                            onChange={(e) => setColumnFilters(prev => ({ ...prev, op: e.target.value }))}
                          >
                            <option value="All">OP</option>
                            <option value="Unassigned">Unassigned</option>
                            {Array.from(new Set(rawOrders.map(o => {
                              let r: any = {};
                              if (o.raw_helios_row) try { r = JSON.parse(o.raw_helios_row); } catch(e){}
                              return r.Operateur;
                            }))).filter(v => v && v !== 'Unassigned').map(v => (
                              <option key={v as string} value={v as string}>{v as string}</option>
                            ))}
                          </select>
                        </th>
                        <th className="px-2 border-r border-[#1E2A38] h-full flex items-center font-normal text-[#E8EDF5]">
                          <select
                            className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                            value={columnFilters.ofH || "All"}
                            onChange={(e) => setColumnFilters(prev => ({ ...prev, ofH: e.target.value }))}
                          >
                            <option value="All">OF H</option>
                            {Array.from(new Set(rawOrders.map(o => {
                              let r: any = {};
                              if (o.raw_helios_row) try { r = JSON.parse(o.raw_helios_row); } catch(e){}
                              return r["OF HELIOS"] || o.planning_job_code;
                            }))).filter(Boolean).map(v => (
                              <option key={v as string} value={v as string}>{v as string}</option>
                            ))}
                          </select>
                        </th>
                        <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">OF SAP</th>
                        <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5] min-w-[200px]">DESIG</th>
                        <th className="px-2 border-r border-[#1E2A38] h-full bg-[#0E1218] font-normal truncate">
                          <select
                            className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                            value={columnFilters.statut}
                            onChange={(e) => setColumnFilters(prev => ({ ...prev, statut: e.target.value }))}
                          >
                            <option value="All">STAT</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="READY_TO_SCHEDULE">READY</option>
                            <option value="SCHEDULED">SCHED</option>
                            <option value="IN_PROGRESS">PROG</option>
                            <option value="FINISH">FINISH</option>
                          </select>
                        </th>
                        <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">
                          <select
                            className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                            value={columnFilters.risk === "Late" ? "Late" : "All"}
                            onChange={(e) => setColumnFilters(prev => ({ ...prev, risk: e.target.value }))}
                          >
                            <option value="All">DU</option>
                            <option value="Late">LAT</option>
                          </select>
                        </th>
                        <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">REA</th>
                        <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">
                          <select
                            className="bg-transparent text-[#E8EDF5] font-bold outline-none cursor-pointer w-full tracking-widest uppercase truncate"
                            value={columnFilters.qua || "All"}
                            onChange={(e) => setColumnFilters(prev => ({ ...prev, qua: e.target.value }))}
                          >
                            <option value="All">QUA</option>
                            <option value="OPEN">OPEN</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </th>
                        <th className="px-2 border-r border-[#1E2A38] h-full align-middle font-normal text-[#E8EDF5]">OO</th>
                        <th className="px-2 h-full align-middle font-normal text-[#E8EDF5]">DEL</th>
                      </tr>
                    </thead>

                    <tbody className="border-t border-[#1E2A38]">
                      {filteredOrders.map((order, idx) => {
                        let raw: Record<string, string> = {};
                        if (order.raw_helios_row) {
                            try { raw = JSON.parse(order.raw_helios_row); } catch(e) {}
                          }
                          const eap = raw.EAP || order.work_center_code || '—';
                          const type3523 = order.aircraft_zone || raw["3523"] || '—';
                          const operator = raw.Operateur || order.assigned_team_name || 'Unassigned';
                          const ofHelios = raw["OF HELIOS"] || order.planning_job_code;
                          const erpOf = raw.OF || order.erp_order_id;
                          const designation = raw.Designation || order.designation;

                          return (
                            <tr
                              key={order.id}
                              className={`h-[32.2812px] transition-colors group cursor-pointer ${
                                idx % 2 === 0 ? 'bg-[#0E1218]' : 'bg-[#131920]'
                              } hover:bg-[#1E2A38]/50`}
                              onClick={() => setSelectedJob(order)}
                            >
                                <td className="px-2 font-bold text-[#E8EDF5] truncate border-r border-[#1E2A38] max-w-[150px] border-b">{eap}</td>
                                <td className="px-2 text-[#A0AEC0] truncate border-r border-[#1E2A38] max-w-[150px] border-b">{type3523}</td>
                                <td className="px-2 text-[#A0AEC0] truncate uppercase border-r border-[#1E2A38] max-w-[150px] border-b">{operator}</td>
                                <td className="px-2 font-mono text-[#E8EDF5] truncate border-r border-[#1E2A38] max-w-[150px] border-b">{ofHelios}</td>
                                <td className="px-2 font-mono text-[#E8EDF5] truncate border-r border-[#1E2A38] max-w-[150px] border-b">{erpOf}</td>
                                <td className="px-2 text-[#E8EDF5] truncate font-medium border-r border-[#1E2A38] max-w-[300px] border-b" title={designation}>{designation}</td>
                                <td className="px-2 border-r border-[#1E2A38] truncate min-w-[70px] border-b">
                                  <select 
                                    value={order.job_status}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      fetch(`/api/planning/jobs/${order.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ job_status: e.target.value })
                                      }).then(() => fetchData())
                                    }}
                                    className={`text-[9px] font-bold tracking-wider rounded px-1.5 py-0.5 outline-none border transition-colors cursor-pointer w-full text-ellipsis overflow-hidden whitespace-nowrap ${
                                      order.job_status === 'READY_TO_SCHEDULE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                                      order.job_status === 'DRAFT' ? 'bg-[#253345] text-[#A0AEC0] border-[#3F5270]' :
                                      'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                    }`}
                                  >
                                    <option value="DRAFT" className="bg-[#0E1218] text-[#E8EDF5]">DRAFT</option>
                                    <option value="READY_TO_SCHEDULE" className="bg-[#0E1218] text-[#E8EDF5]">READY</option>
                                    <option value="SCHEDULED" className="bg-[#0E1218] text-[#E8EDF5]">SCHED</option>
                                    <option value="IN_PROGRESS" className="bg-[#0E1218] text-[#E8EDF5]">PROG</option>
                                    <option value="FINISH" className="bg-[#0E1218] text-[#E8EDF5]">FINISH</option>
                                  </select>
                                </td>
                                <td className="px-2 text-[#A0AEC0] font-mono truncate border-r border-[#1E2A38] w-[80px] border-b">{order.estimated_load_hours}h</td>
                                <td className="px-2 text-[#3B82F6] font-mono truncate font-bold border-r border-[#1E2A38] w-[80px] border-b">{order.realisation_progress_percent}%</td>
                                <td className="px-2 font-bold text-[#7A8EA8] truncate border-r border-[#1E2A38] w-[80px] border-b">{order.quality_status.replace(/_/g, " ")}</td>
                                <td className="px-2 text-[#E8EDF5] font-mono truncate border-r border-[#1E2A38] w-[80px] border-b">{raw.OO || raw.Oo || raw.oo || ''}</td>
                                <td className="px-2 border-b text-center w-[40px]" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to remove this job row (${order.planning_job_code || order.id})?`)) {
                                        fetch(`/api/planning/jobs/${order.id}`, { method: 'DELETE' })
                                          .then(() => fetchData());
                                      }
                                    }}
                                    className="p-1 rounded text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer inline-flex items-center justify-center"
                                    title="Remove job row"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
              </div>

              {/* RIGHT PANEL - TIMELINE/GANTT */}
              <div 
                className="flex-1 flex flex-col overflow-auto bg-[#080B0F] relative"
                ref={rightScrollRef}
                onScroll={handleRightScroll}
              >
                 {/* Right Header */}
                 <div className="h-[32.2812px] sticky top-0 bg-[#010814] border-b border-[#1E2A38] z-30 shadow-xl min-w-max flex">
                    <div 
                      className="grid h-full"
                      style={{ 
                        width: viewMode === "Day" ? '1152px' : '900px',
                        gridTemplateColumns: `repeat(${timelineSegments.length}, 1fr)`
                      }}
                    >
                      {timelineSegments.map((seg, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-center border-r border-[#1E2A38] text-[10px] font-bold text-[#7A8EA8] h-full"
                        >
                          {seg}
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Right Body */}
                 <div className="flex flex-col min-w-max pb-10 relative">
                   {/* Right Rows */}
                    {filteredOrders.map((order, idx) => (
                           <div
                             key={order.id}
                             className={`flex h-[32.2812px] border-b border-[#1E2A38] transition-colors group relative ${
                               idx % 2 === 0 ? 'bg-[#0E1218]' : 'bg-[#131920]'
                             } hover:bg-[#1E2A38]/50`}
                             onClick={() => setSelectedJob(order)}
                           >
                             <div 
                               className="flex-1 relative" 
                               style={{ 
                                 width: viewMode === "Day" ? '1152px' : '900px'
                               }}
                             >
                               <div 
                                 className="absolute inset-0 grid pointer-events-none"
                                 style={{
                                   gridTemplateColumns: `repeat(${timelineSegments.length}, 1fr)`
                                 }}
                               >
                                 {timelineSegments.map((_, i) => (
                                   <div key={i} className="border-r border-[#1E2A38] h-full" />
                                 ))}
                               </div>

                               {/* Horizontal lines */}
                               <div 
                                 className="absolute inset-0 pointer-events-none"
                                 style={{
                                   backgroundSize: '100% 32px',
                                   backgroundImage: `linear-gradient(to bottom, #1E2A38 1px, transparent 1px)`
                                 }}
                               />

                               <GanttBar 
                                 order={order} 
                                 onClick={setSelectedJob} 
                                 selected={selectedJob?.id === order.id} 
                                 segmentWidth={segmentWidth}
                                 viewMode={viewMode}
                                 isDragging={draggedJob?.id === order.id}
                                 dragOffsetMs={draggedJob?.id === order.id ? draggedOffsetMs : 0}
                                 onDragStart={(orderId, origStart, origEnd, clientX) => {
                                   dragStartXRef.current = clientX;
                                   setDraggedJob({ id: orderId, originalStart: origStart, originalEnd: origEnd });
                                   setDraggedOffsetMs(0);
                                 }}
                               />
                             </div>
                           </div>
                       ))}
                 </div>
              </div>

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
                    <StatusBadge status={selectedJob.job_status} />
                    <button 
                      onClick={() => setSelectedJob(null)}
                      className="p-1.5 rounded-md text-[#3F5270] hover:text-[#E8EDF5] hover:bg-[#212C3D] transition-all cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <h3 className="text-base font-bold mb-1">
                    {selectedJob.planning_job_code}
                  </h3>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button 
                      onClick={() => setActiveTab("Planner")}
                      className="px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#3B82F6] text-white text-[10px] font-bold tracking-wider rounded uppercase cursor-pointer transition-colors"
                    >
                      Open in Planner
                    </button>
                    
                    <div className="relative">
                      <select
                        value={selectedJob.assigned_team_id || ""}
                        onChange={(e) => {
                          const teamId = e.target.value || null;
                          setSelectedJob(prev => prev ? { 
                            ...prev, 
                            assigned_team_id: teamId || undefined,
                            assigned_team_name: teamId ? (teams.find(t => t.id === teamId)?.name || null) : null
                          } : null);
                          fetch(`/api/planning/jobs/${selectedJob.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ assigned_team_id: teamId })
                          }).then(() => fetchData());
                        }}
                        className="px-3 py-1.5 bg-[#212C3D] hover:bg-[#2A384B] border border-[#253345] text-[#E8EDF5] text-[10px] font-bold tracking-wider rounded uppercase cursor-pointer outline-none transition-colors"
                      >
                        <option value="">No Team</option>
                        {teams.map(t => (
                          <option key={t.id} value={t.id} className="bg-[#0E1218] text-[#E8EDF5]">{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      onClick={() => {
                        const nextStatus = selectedJob.job_status === 'BLOCKED' ? 'READY_TO_SCHEDULE' : 'BLOCKED';
                        setSelectedJob(prev => prev ? { ...prev, job_status: nextStatus } : null);
                        fetch(`/api/planning/jobs/${selectedJob.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ job_status: nextStatus })
                        }).then(() => fetchData());
                      }}
                      className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded uppercase cursor-pointer transition-colors ${
                        selectedJob.job_status === 'BLOCKED'
                          ? 'bg-[#1e3a27] text-[#4ade80] hover:bg-[#15803d]'
                          : 'bg-[#3D1A1A] hover:bg-[#C2410C] text-[#ef4444]'
                      }`}
                    >
                      {selectedJob.job_status === 'BLOCKED' ? "Unblock Job" : "Mark Blocked"}
                    </button>

                    <button 
                      onClick={() => {
                        const isSch = selectedJob.job_status === 'SCHEDULED' || selectedJob.job_status === 'IN_PROGRESS';
                        const nextStatus = isSch ? 'READY_TO_SCHEDULE' : 'SCHEDULED';
                        setSelectedJob(prev => prev ? { ...prev, job_status: nextStatus } : null);
                        fetch(`/api/planning/jobs/${selectedJob.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ job_status: nextStatus })
                        }).then(() => fetchData());
                      }}
                      className="px-3 py-1.5 bg-[#212C3D] hover:bg-[#2A384B] border border-[#253345] text-[#E8EDF5] text-[10px] font-bold tracking-wider rounded uppercase cursor-pointer transition-colors"
                    >
                      {selectedJob.job_status === 'SCHEDULED' || selectedJob.job_status === 'IN_PROGRESS' 
                        ? "Unschedule" 
                        : "Schedule"}
                    </button>

                    <button 
                      onClick={() => {
                        alert(`Feedback for ${selectedJob.planning_job_code} (ERP OF: ${selectedJob.erp_order_id}) generated and synchronized with Helios ERP queue successfully!`);
                      }}
                      className="px-3 py-1.5 bg-[#212C3D] hover:bg-[#2A384B] border border-[#253345] text-[#E8EDF5] text-[10px] font-bold tracking-wider rounded uppercase cursor-pointer transition-colors"
                    >
                      Generate Feedback
                    </button>
                  </div>
                </div>

                {/* Helios Summary */}
                <div className="p-4 border-b border-[#1E2A38]">
                  <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase mb-3 flex items-center justify-between">
                    <span>Helios ERP Data</span>
                    <span className="bg-[#1A2230] px-2 py-0.5 rounded text-[#7A8EA8]">Read-Only</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["ERP Order ID", selectedJob.erp_order_id],
                      ["ERP Status", "IMPORTED"],
                      ["Designation", selectedJob.designation],
                      ["Part Reference", selectedJob.part_reference],
                      ["Zone", selectedJob.aircraft_zone],
                      ["Work Center", selectedJob.work_center_code],
                      ["Quantity", selectedJob.quantity],
                      ["Estimated Load", `${selectedJob.estimated_load_hours}h`],
                      ["Planned Start", selectedJob.planned_start_at?.split("T")[0] || "—"],
                      ["Planned End", selectedJob.planned_end_at?.split("T")[0] || "—"],
                      ["Supply Status", "Unknown"],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#131920] border border-[#1E2A38] rounded-md p-2">
                        <div className="text-[9px] text-[#3F5270] uppercase tracking-wider mb-1">{label}</div>
                        <div className="text-[11px] font-semibold text-[#A0AEC0] truncate" title={String(value)}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AeroForg Planning */}
                <div className="p-4 border-b border-[#1E2A38]">
                  <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase mb-3">AeroForg Planning</div>
                  
                  <div className="space-y-4 mb-4">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#7A8EA8] uppercase tracking-wider text-[9px]">Physical Progress</span>
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
                        <span className="text-[#7A8EA8] uppercase tracking-wider text-[9px]">Time Consumption</span>
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
                    {[
                      ["Job Status", selectedJob.job_status],
                      ["Assigned Team", selectedJob.assigned_team_id || "Unassigned"],
                      ["Scheduled Start", selectedJob.scheduled_start_at?.split("T")[0] || "—"],
                      ["Scheduled End", selectedJob.scheduled_end_at?.split("T")[0] || "—"],
                      ["Material Risk", selectedJob.material_risk],
                      ["Planning Risk", selectedJob.planning_risk],
                      ["Quality Status", selectedJob.quality_status],
                      ["Rework Count", selectedJob.rework_count],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#1A2230] border border-[#253345] rounded-md p-2 shadow-sm">
                        <div className="text-[9px] text-[#7A8EA8] uppercase tracking-wider mb-1">{label}</div>
                        <div className="text-[11px] font-semibold text-[#E8EDF5] truncate" title={String(value)}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assignments */}
                <div className="p-4 flex-1">
                  <div className="text-[10px] font-bold text-[#3F5270] tracking-widest uppercase mb-3">Assignments</div>
                  <div className="bg-[#1A2230] border border-[#1E2A38] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[12px] font-mono">{selectedJob.planning_job_code}</div>
                      <div className="text-[10px] text-[#3F5270]">Multiple Assignments</div>
                    </div>
                    <StatusBadge status={selectedJob.job_status} />
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
      </div>
    )}

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

        <HeliosImportModal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); fetchData(); }} />
        <MappingAdminModal isOpen={isMappingOpen} onClose={() => setIsMappingOpen(false)} />
        <DatabaseExplorerModal isOpen={isDatabaseExplorerOpen} onClose={() => setIsDatabaseExplorerOpen(false)} />
        <UsersAdminModal isOpen={isUsersOpen} onClose={() => setIsUsersOpen(false)} />
      </main>
    </div>
  );
}
