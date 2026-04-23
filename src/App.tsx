import React, { useState, useEffect, useRef } from "react";
import { AppConfig, HAM_BANDS, DxSpot, BAND_FREQUENCIES } from "./types";
import { getCountryInfoByCallsign } from "./dxcc";
import { 
  Settings, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  MoreVertical, 
  X,
  Edit2,
  Check,
  Radio,
  Layers,
  History,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Helpers ---

// --- Components ---

interface BandColumnProps {
  config: any;
  spots: DxSpot[];
  workedQSOs: Record<string, string[]>;
  onUpdate: (id: string, updates: any) => void;
  onHide: (id: string) => void;
  onHoverSpot: (spot: DxSpot | null, e?: React.MouseEvent) => void;
}

const BandColumn: React.FC<BandColumnProps> = ({ 
  config, 
  spots,
  workedQSOs,
  onUpdate, 
  onHide,
  onHoverSpot
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(config.title);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement>(null);

  const handleTitleSubmit = () => {
    onUpdate(config.id, { title: tempTitle });
    setIsEditingTitle(false);
  };

  const filteredSpots = React.useMemo(() => {
    const range = BAND_FREQUENCIES[config.band];
    
    // Deduplicate: Keep only the newest spot per DX callsing on this band
    const spotMap = new Map<string, DxSpot>();
    spots.forEach(s => {
      if (s.frequency >= range.min && s.frequency <= range.max) {
        const existing = spotMap.get(s.dxCall);
        if (!existing || new Date(s.timestamp) > new Date(existing.timestamp)) {
          spotMap.set(s.dxCall, s);
        }
      }
    });

    return Array.from(spotMap.values())
      .sort((a, b) => a.frequency - b.frequency);
  }, [spots, config.band]);

  // Find the spot closest to the current VFO frequency
  const closestSpotId = React.useMemo(() => {
    if (!config.currentFrequency || filteredSpots.length === 0) return null;
    
    let closestId: string | null = null;
    let minDiff = Infinity;
    filteredSpots.forEach(s => {
      const diff = Math.abs(s.frequency - (config.currentFrequency || 0));
      if (diff < minDiff) {
        minDiff = diff;
        closestId = s.dxCall;
      }
    });
    return closestId;
  }, [filteredSpots, config.currentFrequency]);

  // Auto-scroll logic: keep the active row in sight
  useEffect(() => {
    if (activeRowRef.current && scrollContainerRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [closestSpotId, config.currentFrequency]);

  return (
    <motion.div 
      layout
      className="flex flex-col h-full border-r border-brand-border bg-brand-bg relative flex-1 min-w-[200px] group"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 h-[36px] bg-brand-surface border-b border-brand-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 w-full relative">
              <input 
                autoFocus
                className="bg-black/20 border border-brand-accent/50 text-[11px] px-1 w-full rounded outline-none"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              />
              <button onClick={handleTitleSubmit} className="text-green-500 hover:scale-110 transition-transform">
                <Check size={10} />
              </button>
            </div>
          ) : (
            <span 
              className="text-[11px] font-bold uppercase tracking-wider text-text-dim truncate cursor-pointer hover:text-brand-accent hover:border-brand-accent border border-transparent px-1 rounded transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {config.title}
            </span>
          )}
        </div>
        <button 
          onClick={() => onHide(config.id)}
          className="text-text-dim hover:text-red-400 hover:bg-red-400/10 transition-all p-1 rounded"
          title="Ausblenden"
        >
          <X size={12} />
        </button>
      </div>

      {/* Control Area */}
      <div className="p-2.5 bg-black/20 border-b border-brand-border space-y-2">
        <div className="space-y-1">
          <div className="relative">
            <select 
              value={config.band}
              onChange={(e) => onUpdate(config.id, { band: e.target.value })}
              className="w-full bg-brand-elevated border border-brand-border rounded px-2 py-1 text-[12px] text-white appearance-none focus:border-brand-accent transition-all cursor-pointer hover:border-text-dim"
            >
              {HAM_BANDS.map(band => (
                <option key={band} value={band}>{band}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-dim" size={14} />
          </div>
          {config.currentFrequency && (
            <div className="mt-2 bg-brand-accent/10 border border-brand-accent/30 rounded py-1 px-2 flex items-center justify-between">
              <span className="text-[9px] text-brand-accent font-bold uppercase tracking-tighter">VFO:</span>
              <span className="text-[14px] text-white font-bold font-mono tracking-wider">{config.currentFrequency.toFixed(3)} <span className="text-[9px] opacity-60">MHz</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Content Area (High Density Table View) */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-scroll p-2 font-mono text-[16.5px] scrollbar-thin scrollbar-thumb-brand-border"
      >
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="text-text-dim border-b border-brand-border text-[10px] tracking-tighter">
              <th className="text-left font-normal pb-2 w-[85px]">MHZ</th>
              <th className="text-left font-normal pb-2">DX-STATION</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {filteredSpots.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-2 text-center text-text-dim/30 text-[11px] italic">Keine Spots in {config.band}</td>
              </tr>
            ) : (
              filteredSpots.map((item) => {
                const isClosest = item.dxCall === closestSpotId;
                const dxCountry = getCountryInfoByCallsign(item.dxCall);
                const spotterCountry = getCountryInfoByCallsign(item.spotterCall);
                const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                    <tr 
                      key={item.dxCall} 
                      ref={isClosest ? activeRowRef : null}
                      onMouseEnter={(e) => onHoverSpot(item, e)}
                      onMouseLeave={() => onHoverSpot(null)}
                      className={`transition-colors border-b border-white/[0.02] cursor-default group/row relative ${isClosest ? 'bg-brand-accent/20' : 'hover:bg-brand-accent/10'}`}
                    >
                      <td className={`py-1 truncate font-bold ${isClosest ? 'text-white underline decoration-brand-accent' : 'text-brand-accent/80'}`}>{item.frequency.toFixed(3)}</td>
                      <td className="py-1 flex items-center gap-2 min-w-0 relative">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span 
                            className="text-lg leading-none shrink-0" 
                            title={dxCountry.name}
                          >
                            {dxCountry.flag}
                          </span>
                          <span className={`truncate font-bold ${
                            item.isManual ? 'text-yellow-400' : 
                            workedQSOs[config.band]?.includes(item.dxCall.toUpperCase()) ? 'text-green-500' : 
                            'text-text-main'
                          }`}>
                            {item.dxCall}
                          </span>
                        </div>
                      </td>
                    </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showAnzeigeMenu, setShowAnzeigeMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [didConfirmReset, setDidConfirmReset] = useState(false);
  const [clusterLines, setClusterLines] = useState<string[]>([]);
  const [clusterStatus, setClusterStatus] = useState("DISCONNECTED");
  const [receivedChars, setReceivedChars] = useState(0);
  const [consoleHeight, setConsoleHeight] = useState(180);
  const [spots, setSpots] = useState<DxSpot[]>([]);
  const [workedQSOs, setWorkedQSOs] = useState<Record<string, string[]>>({});
  const [hoveredSpot, setHoveredSpot] = useState<{ spot: DxSpot, x: number, y: number } | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const retentionHoursRef = useRef(4);

  // Update ref when config changes
  useEffect(() => {
    if (config?.retentionHours) {
      retentionHoursRef.current = config.retentionHours;
    }
  }, [config?.retentionHours]);

  // Persistence
  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => setConfig(data));
  }, []);

  // WebSocket for Cluster
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        setClusterLines(data.history || []);
        setClusterStatus(data.status);
        setReceivedChars(data.charCount || 0);
        setSpots(data.spots || []);
        setWorkedQSOs(data.workedQSOs || {});
      } else if (data.type === "status") {
        setClusterStatus(data.status);
      } else if (data.type === "data") {
        setClusterLines(prev => [...prev.slice(-99), ...data.lines]);
        setReceivedChars(data.charCount);
      } else if (data.type === "spot:new") {
        setSpots(prev => {
          const hours = retentionHoursRef.current;
          const cutoff = Date.now() - (hours * 60 * 60 * 1000);
          return [...prev.filter(s => new Date(s.timestamp).getTime() > cutoff), data.spot];
        });
      } else if (data.type === "spots:init") {
        setSpots(data.spots);
      } else if (data.type === "qso:update") {
        setWorkedQSOs(data.workedQSOs);
      } else if (data.type === "config") {
        setConfig(data.config);
      } else if (data.type === "column:freq") {
        setConfig(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map(col => 
              col.id === data.columnId ? { ...col, currentFrequency: data.frequency } : col
            )
          };
        });
      }
    };

    return () => ws.close();
  }, []);

  // Auto-scroll console
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [clusterLines, config?.bottomAreaVisible]);

  // Resizing logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newHeight = window.innerHeight - e.clientY - 24; // 24 is status bar
      if (newHeight > 50 && newHeight < window.innerHeight * 0.8) {
        setConsoleHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const saveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig)
    });
  };

  const updateColumn = (id: string, updates: any) => {
    if (!config) return;
    const newConfig = {
      ...config,
      columns: config.columns.map(col => col.id === id ? { ...col, ...updates } : col)
    };
    saveConfig(newConfig);
  };

  const toggleColumn = (id: string) => {
    if (!config) return;
    const col = config.columns.find(c => c.id === id);
    updateColumn(id, { visible: !col?.visible });
  };

  const toggleBottomArea = () => {
    if (!config) return;
    saveConfig({ ...config, bottomAreaVisible: !config.bottomAreaVisible });
  };

  const resetWorkedQSOs = () => {
    fetch("/api/qso/reset", { method: "POST" });
    setDidConfirmReset(false);
  };

  const handleHoverSpot = (spot: DxSpot | null, e?: React.MouseEvent) => {
    if (!spot || !e) {
      setHoveredSpot(null);
      return;
    }
    
    // Position the tooltip near the mouse, but ensure it stays within viewport
    const x = Math.min(e.clientX + 10, window.innerWidth - 340);
    const y = Math.min(e.clientY + 10, window.innerHeight - 300);
    
    setHoveredSpot({ spot, x, y });
  };

  if (!config) return (
    <div className="h-screen bg-brand-bg flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.2em] text-brand-accent">
      <div className="flex items-center gap-3">
        <Radio size={20} className="animate-spin" />
        BOOTING MULTI-BANDMAP SYSTEM v0.2.3...
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-brand-bg overflow-hidden select-none">
      {/* Title Bar - High Density Height (40px) */}
      <header className="h-[40px] bg-brand-surface flex items-center border-b border-brand-border px-3 justify-between z-50">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-brand-accent" />
            <div className="flex items-baseline gap-1.5">
              <h1 className="font-bold tracking-widest text-brand-accent uppercase text-[13px]">Multi-Bandmap</h1>
              <span className="text-[9px] font-mono text-text-dim opacity-60">v0.2.3</span>
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            <div className="relative">
              <button 
                onClick={() => setShowAnzeigeMenu(!showAnzeigeMenu)}
                className={`text-[12px] px-3 py-1 rounded transition-all flex items-center gap-1.5 ${showAnzeigeMenu ? 'bg-brand-elevated text-brand-accent' : 'hover:bg-brand-elevated text-text-dim hover:text-text-main'}`}
              >
                Anzeige <ChevronDown size={12} className={showAnzeigeMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              
              <AnimatePresence>
                {showAnzeigeMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-1 w-64 bg-brand-surface border border-brand-border rounded shadow-2xl p-1 z-50"
                  >
                    <div className="text-[10px] uppercase font-bold text-text-dim px-3 py-2 border-b border-brand-border mb-1">Grid Management</div>
                    {config.columns.map(col => (
                      <button 
                        key={col.id}
                        onClick={() => toggleColumn(col.id)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-brand-elevated transition-colors group"
                      >
                        <span className="text-[11px] text-text-dim group-hover:text-white">{col.title} ({col.band})</span>
                        {col.visible ? <Eye size={13} className="text-brand-accent" /> : <EyeOff size={13} className="text-text-dim opacity-50" />}
                      </button>
                    ))}
                    <div className="border-t border-brand-border mt-1 pt-1">
                      <button 
                        onClick={toggleBottomArea}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-brand-elevated transition-colors group"
                      >
                        <span className="text-[11px] text-text-dim group-hover:text-white">System Konsole</span>
                        {config.bottomAreaVisible ? <Eye size={13} className="text-brand-accent" /> : <EyeOff size={13} className="text-text-dim opacity-50" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`text-[10px] font-mono flex items-center gap-2 border px-2 py-0.5 rounded bg-opacity-5 ${
            clusterStatus === 'CONNECTED' ? 'text-brand-accent border-brand-accent/20 bg-brand-accent/5' : 
            clusterStatus === 'CONNECTING' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' : 
            'text-red-500 border-red-500/20 bg-red-500/5'
          }`}>
            <span className={`w-1 h-1 rounded-full ${
              clusterStatus === 'CONNECTED' ? 'bg-brand-accent animate-pulse' : 
              clusterStatus === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`}></span>
            CLUSTER: {clusterStatus}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setDidConfirmReset(false);
              }}
              className={`text-text-dim hover:text-white transition-colors ${showSettingsMenu ? 'text-brand-accent' : ''}`}
            >
              <Settings size={16} />
            </button>
            
            <AnimatePresence>
              {showSettingsMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 mt-2 w-64 bg-brand-surface border border-brand-border rounded shadow-2xl p-3 z-50 space-y-3"
                >
                  <div className="text-[10px] uppercase font-bold text-text-dim border-b border-brand-border pb-1.5 flex items-center gap-1.5">
                    <Clock size={12} /> System-Konfiguration
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] text-text-dim flex justify-between">
                      <span>Daten-Speicherdauer</span>
                      <span className="text-brand-accent font-bold">{config.retentionHours} Std.</span>
                    </label>
                    <input 
                      type="range"
                      min="1"
                      max="72"
                      value={config.retentionHours}
                      onChange={(e) => saveConfig({ ...config, retentionHours: parseInt(e.target.value) })}
                      className="w-full accent-brand-accent h-1.5 bg-brand-elevated rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-[9px] text-text-dim italic">Erhöht die Dauer, wie lange DX-Spots im Cache verbleiben.</div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-brand-border">
                    <div className="text-[10px] uppercase font-bold text-text-dim flex items-center gap-1.5 pb-1">
                      <Radio size={12} /> Cluster-Settings
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-text-dim">Host / URL</label>
                      <input 
                        type="text"
                        className="w-full bg-brand-elevated border border-brand-border rounded px-2 py-1 text-[11px] text-white focus:border-brand-accent outline-none"
                        value={config.clusterHost || ""}
                        onChange={(e) => setConfig({...config, clusterHost: e.target.value})}
                        onBlur={() => saveConfig(config)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-dim">Port</label>
                        <input 
                          type="number"
                          className="w-full bg-brand-elevated border border-brand-border rounded px-2 py-1 text-[11px] text-white focus:border-brand-accent outline-none"
                          value={config.clusterPort || ""}
                          onChange={(e) => setConfig({...config, clusterPort: parseInt(e.target.value) || 0})}
                          onBlur={() => saveConfig(config)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-dim">Login (optional)</label>
                        <input 
                          type="text"
                          className="w-full bg-brand-elevated border border-brand-border rounded px-2 py-1 text-[11px] text-white focus:border-brand-accent outline-none"
                          value={config.clusterCallsign || ""}
                          onChange={(e) => setConfig({...config, clusterCallsign: e.target.value.toUpperCase()})}
                          onBlur={() => saveConfig(config)}
                          placeholder="z.B. DF0OT"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-brand-border">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] text-text-dim group-hover:text-white transition-colors">Autom. Band-Wechsel</span>
                      <div 
                        onClick={() => saveConfig({ ...config, autoBandSwitch: !config.autoBandSwitch })}
                        className={`w-8 h-4 rounded-full relative transition-colors ${config.autoBandSwitch ? 'bg-brand-accent' : 'bg-brand-elevated border border-brand-border'}`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-all transform ${config.autoBandSwitch ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </label>
                    <div className="text-[9px] text-text-dim italic leading-tight">Wechselt das Spalten-Band automatisch bei QRG-Änderung über API.</div>
                  </div>
                  
                  <div className="pt-2 border-t border-brand-border space-y-3">
                    <div className="text-[9px] text-text-dim mb-1 uppercase opacity-50">Zuletzt gespeichert: DX-Spots ({spots.length})</div>
                    
                    {!didConfirmReset ? (
                      <button 
                        onClick={() => setDidConfirmReset(true)}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] py-1.5 rounded border border-red-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <History size={12} />
                        Worked QSOs zurücksetzen
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="text-[10px] text-red-500 font-bold text-center">Sicher? Alle QSOs löschen?</div>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={resetWorkedQSOs}
                            className="bg-red-500 hover:bg-red-600 text-white text-[11px] py-1.5 rounded font-bold transition-all"
                          >
                            JA, LÖSCHEN
                          </button>
                          <button 
                            onClick={() => setDidConfirmReset(false)}
                            className="bg-brand-elevated hover:bg-brand-border text-white text-[11px] py-1.5 rounded transition-all"
                          >
                            ABBRECHEN
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Grid area */}
      <main className="flex-1 flex overflow-hidden border-b border-brand-border">
        <div className="flex-1 flex overflow-x-hidden min-h-0 bg-brand-bg w-full">
          <AnimatePresence mode="popLayout">
            {config.columns
              .filter(col => col.visible)
              .map(col => (
                <BandColumn 
                  key={col.id}
                  config={col}
                  spots={spots}
                  workedQSOs={workedQSOs}
                  onUpdate={updateColumn}
                  onHide={(id) => toggleColumn(id)}
                  onHoverSpot={handleHoverSpot}
                />
              ))}
          </AnimatePresence>
          
          {config.columns.every(c => !c.visible) && (
            <div className="flex-1 flex items-center justify-center flex-col text-text-dim space-y-4">
              <EyeOff size={40} className="opacity-20" />
              <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-center opacity-40">
                ACTIVE VIEWPORT EMPTY
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Area - High Density Style */}
      <AnimatePresence>
        {config.bottomAreaVisible && (
          <motion.footer 
            initial={{ height: 0 }}
            animate={{ height: consoleHeight }}
            exit={{ height: 0 }}
            className="bg-brand-surface overflow-hidden flex flex-col shrink-0 relative"
          >
            {/* Resize Handle */}
            <div 
              className="absolute top-0 left-0 w-full h-1 cursor-ns-resize hover:bg-brand-accent/50 transition-colors z-50"
              onMouseDown={(e) => {
                isResizing.current = true;
                document.body.style.cursor = "ns-resize";
                e.preventDefault();
              }}
            />

            <div className="flex items-center justify-between px-3 h-[32px] border-b border-brand-border bg-brand-surface shrink-0">
              <span className="text-[11px] uppercase font-bold tracking-widest text-text-dim">System Log / Console Output</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setClusterLines([])}
                  className="bg-brand-elevated border border-brand-border rounded px-3 py-0.5 text-[11px] text-white hover:border-brand-accent transition-all active:scale-95"
                >
                  Clear
                </button>
                <button onClick={toggleBottomArea} className="text-text-dim hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-3 bg-black flex flex-col min-h-0">
              <div 
                ref={consoleRef}
                className="flex-1 bg-[#050505] rounded border border-brand-border p-2 font-mono text-[12px] text-[#10B981] overflow-y-scroll leading-relaxed scrollbar-thin scrollbar-thumb-brand-accent scrollbar-track-brand-bg/50"
              >
                {clusterLines.length === 0 ? (
                  <div className="text-gray-700 italic">Warte auf Cluster-Daten...</div>
                ) : (
                  clusterLines.map((line, idx) => {
                    const isStatusLine = !line.startsWith('DX de') && !line.startsWith('# DX de');
                    return (
                      <div 
                        key={idx} 
                        className={`whitespace-pre-wrap ${isStatusLine ? 'text-yellow-500 opacity-90' : 'text-[#10B981]'}`}
                      >
                        {line}
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} className="h-0" />
                <div className="animate-pulse">_</div>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <footer className="h-[24px] bg-brand-surface border-t border-brand-border px-3 flex items-center justify-between text-[10px] text-text-dim font-mono tracking-wider">
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${clusterStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500'}`}></span> 
            DX-CLUSTER: {clusterStatus} ({config?.clusterHost})
          </span>
          <span className="text-brand-accent">{config?.clusterCallsign || 'GUEST'}</span>
          <span>DX-SPOTS: {spots.length}</span>
        </div>
        <div className="flex gap-4">
          <span>© 2025-2026 by DD6ZJ</span>
        </div>
      </footer>

      {/* Global Tooltip */}
      <AnimatePresence>
        {hoveredSpot && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ left: hoveredSpot.x, top: hoveredSpot.y }}
            className="fixed z-[999] w-80 bg-brand-surface border border-brand-accent p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-none backdrop-blur-2xl transition-all duration-75"
          >
            {(() => {
              const dxCountry = getCountryInfoByCallsign(hoveredSpot.spot.dxCall);
              const spotterCountry = getCountryInfoByCallsign(hoveredSpot.spot.spotterCall);
              const time = new Date(hoveredSpot.spot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <>
                  <div className="text-[13px] text-brand-accent font-bold mb-3 opacity-90 uppercase tracking-[0.1em] border-b border-brand-accent/20 pb-1.5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span>Spot Details</span>
                      {hoveredSpot.spot.isManual && (
                        <span className="bg-yellow-500/20 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded border border-yellow-500/30 animate-pulse">
                          MANUELL
                        </span>
                      )}
                    </div>
                    <span className="text-white/50">{time} UTC</span>
                  </div>
                  <div className="space-y-4 text-[14px]">
                    <div>
                      <div className="text-text-dim text-[12px] uppercase tracking-tighter mb-1">Station Info</div>
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-md">
                        <span className="text-3xl">{dxCountry.flag}</span>
                        <div>
                          <div className="text-white font-bold text-lg leading-tight">{hoveredSpot.spot.dxCall}</div>
                          <div className="text-[12px] text-text-dim">{dxCountry.name}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/2 pb-1">
                         <div className="text-text-dim text-[12px] uppercase tracking-tighter">Frequenz</div>
                         <div className="text-brand-accent font-mono text-lg">{(hoveredSpot.spot.frequency * 1000).toFixed(1)} kHz</div>
                       </div>
                       <div className="bg-white/2 pb-1">
                         <div className="text-text-dim text-[12px] uppercase tracking-tighter">Zeit</div>
                         <div className="text-white font-mono text-lg">{time}</div>
                       </div>
                    </div>

                    <div className="bg-white/2 rounded p-1 px-1.5">
                      <div className="text-text-dim text-[12px] uppercase tracking-tighter mb-1">Spotter</div>
                      <div className="flex items-center gap-2.5 text-[13px]">
                        <span className="text-xl leading-none">{spotterCountry.flag}</span>
                        <span className="text-white font-semibold">{hoveredSpot.spot.spotterCall}</span>
                        <span className="text-[12px] text-text-dim truncate">({spotterCountry.name})</span>
                      </div>
                    </div>

                    {hoveredSpot.spot.info && (
                      <div className="bg-brand-accent/10 border border-brand-accent/20 p-2 rounded-md text-[13px] text-text-main italic border-l-4 border-l-brand-accent leading-relaxed">
                        "{hoveredSpot.spot.info}"
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
