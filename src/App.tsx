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
  Clock,
  ArrowUp,
  Compass,
  Palette,
  Flag,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Color Helpers & Presets ---

export const ACCENT_COLOR_PRESETS = [
  { name: "Himmelblau", value: "#38bdf8" },
  { name: "Smaragdgrün", value: "#10b981" },
  { name: "Bernsteingelb", value: "#f59e0b" },
  { name: "Neon-Orange", value: "#f97316" },
  { name: "Rubinrot", value: "#f43f5e" },
  { name: "Violett", value: "#a855f7" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Türkis", value: "#14b8a6" },
  { name: "Limettengrün", value: "#84cc16" },
  { name: "Pink", value: "#ec4899" },
  { name: "Goldgelb", value: "#eab308" },
  { name: "Cyan", value: "#06b6d4" },
];

const DEFAULT_COLORS = ["#38bdf8", "#10b981", "#f59e0b", "#f43f5e", "#a855f7"];

export const getColumnColor = (config: any, index?: number): string => {
  if (config?.color) return config.color;
  if (config?.id) {
    const parsedIdx = parseInt(config.id.replace(/\D/g, ""), 10);
    if (!isNaN(parsedIdx) && parsedIdx >= 1) {
      return DEFAULT_COLORS[(parsedIdx - 1) % DEFAULT_COLORS.length];
    }
  }
  return DEFAULT_COLORS[(index ?? 0) % DEFAULT_COLORS.length] || "#38bdf8";
};

export const hexToRgba = (hex?: string, alpha: number = 1): string => {
  if (!hex) return `rgba(56, 189, 248, ${alpha})`;
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c.split("").map(x => x + x).join("");
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(56, 189, 248, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// --- Components ---

interface BandColumnProps {
  config: any;
  columnIndex?: number;
  spots: DxSpot[];
  workedQSOs: Record<string, string[]>;
  showFlags?: boolean;
  alertedSpotKeys?: Set<string>;
  onToggleAlert?: (key: string) => void;
  onUpdate: (id: string, updates: any) => void;
  onHide: (id: string) => void;
  onHoverSpot: (spot: DxSpot | null, e?: React.MouseEvent, color?: string) => void;
}

const BandColumn: React.FC<BandColumnProps> = ({ 
  config, 
  columnIndex,
  spots,
  workedQSOs,
  showFlags = true,
  alertedSpotKeys = new Set(),
  onToggleAlert = (_key: string) => {},
  onUpdate, 
  onHide,
  onHoverSpot
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(config.title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const accentColor = getColumnColor(config, columnIndex);

  const handleTitleSubmit = () => {
    onUpdate(config.id, { title: tempTitle });
    setIsEditingTitle(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showColorPicker]);

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
      className="flex flex-col h-full border-r border-brand-border bg-brand-bg relative flex-1 min-w-[220px] sm:min-w-[245px] lg:min-w-[260px] group shrink-0"
      style={{
        borderTop: `3px solid ${accentColor}`
      }}
    >
      {/* Column Header */}
      <div 
        className="flex items-center justify-between px-2.5 h-[36px] bg-brand-surface border-b border-brand-border"
        style={{
          backgroundColor: hexToRgba(accentColor, 0.05)
        }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div 
            className="w-2 h-2 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${hexToRgba(accentColor, 0.6)}` }}
          />
          {isEditingTitle ? (
            <div className="flex items-center gap-1 w-full relative">
              <input 
                autoFocus
                className="bg-black/20 text-[11px] px-1.5 py-0.5 w-full rounded outline-none text-white font-bold"
                style={{ border: `1px solid ${accentColor}` }}
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              />
              <button onClick={handleTitleSubmit} className="text-green-500 hover:scale-110 transition-transform">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <span 
              className="text-[11px] font-bold uppercase tracking-wider text-text-dim truncate cursor-pointer px-1 rounded transition-colors"
              style={{ color: '#ffffff' }}
              title="Klicken zum Umbenennen"
              onClick={() => setIsEditingTitle(true)}
            >
              {config.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          {/* Color Picker Button & Popover */}
          <div className="relative">
            <button 
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center transition-all p-0.5 group/color"
              title="Akzentfarbe wählen"
            >
              <div 
                className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm transition-transform group-hover/color:scale-110"
                style={{ backgroundColor: accentColor }}
              />
            </button>

            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  ref={colorPickerRef}
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 top-7 w-56 bg-brand-surface border border-brand-border rounded-lg shadow-2xl p-3 z-50 space-y-2.5 text-left"
                >
                  <div className="flex items-center justify-between border-b border-brand-border pb-1.5">
                    <span className="text-[10px] uppercase font-bold text-text-dim flex items-center gap-1.5">
                      <Palette size={12} style={{ color: accentColor }} /> Akzentfarbe
                    </span>
                    <button
                      onClick={() => setShowColorPicker(false)}
                      className="text-text-dim hover:text-white p-0.5 rounded hover:bg-white/5"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-text-dim mb-1.5">Palette</div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {ACCENT_COLOR_PRESETS.map((preset) => {
                        const isSelected = accentColor.toLowerCase() === preset.value.toLowerCase();
                        return (
                          <button
                            key={preset.value}
                            onClick={() => {
                              onUpdate(config.id, { color: preset.value });
                              setShowColorPicker(false);
                            }}
                            className="w-6 h-6 rounded-md border transition-transform hover:scale-110 flex items-center justify-center relative shadow-sm"
                            style={{
                              backgroundColor: preset.value,
                              borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.2)'
                            }}
                            title={preset.name}
                          >
                            {isSelected && <Check size={12} className="text-black font-extrabold stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-brand-border pt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-text-dim">Freie Farbwahl:</span>
                    <div className="flex items-center gap-1.5 bg-brand-elevated border border-brand-border rounded px-2 py-0.5">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => onUpdate(config.id, { color: e.target.value })}
                        className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                        title="Farbwähler öffnen"
                      />
                      <span className="text-[10px] font-mono text-white/90 uppercase">{accentColor}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => onHide(config.id)}
            className="text-text-dim hover:text-red-400 hover:bg-red-400/10 transition-all p-1 rounded"
            title="Ausblenden"
          >
            <X size={12} />
          </button>
        </div>
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
            <div 
              className="mt-2 rounded py-1 px-2 flex items-center justify-between"
              style={{
                backgroundColor: hexToRgba(accentColor, 0.12),
                border: `1px solid ${hexToRgba(accentColor, 0.35)}`
              }}
            >
              <span 
                className="text-[9px] font-bold uppercase tracking-tighter"
                style={{ color: accentColor }}
              >
                VFO:
              </span>
              <span className="text-[14px] text-white font-bold font-mono tracking-wider">
                {config.currentFrequency.toFixed(3)} <span className="text-[9px] opacity-60">MHz</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content Area (High Density Table View) */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-scroll p-1.5 font-mono text-[16.5px] scrollbar-thin scrollbar-thumb-brand-border"
      >
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="text-text-dim border-b border-brand-border text-[10px] tracking-tighter">
              <th className="text-left font-normal pb-1.5 pl-1 w-[86px] sm:w-[92px] lg:w-[98px]">MHZ</th>
              <th className="text-left font-normal pb-1.5 px-1">DX-STATION</th>
              <th className="text-right font-normal pb-1.5 pr-1 w-[68px] sm:w-[92px] lg:w-[115px]">RICHT. / LOC</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {filteredSpots.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-3 text-center text-text-dim/30 text-[11px] italic">Keine Spots in {config.band}</td>
              </tr>
            ) : (
              filteredSpots.map((item) => {
                const isClosest = item.dxCall === closestSpotId;
                const isHovered = hoveredRowId === item.dxCall;
                const spotKey = item.id || item.dxCall;
                const isWorked = Boolean(workedQSOs[config.band]?.includes(item.dxCall.toUpperCase()));
                const isAlerted = !isWorked && (alertedSpotKeys.has(spotKey) || alertedSpotKeys.has(item.dxCall));
                const dxCountry = getCountryInfoByCallsign(item.dxCall);
                const spotterCountry = getCountryInfoByCallsign(item.spotterCall);
                const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                    <tr 
                      key={item.dxCall} 
                      ref={isClosest ? activeRowRef : null}
                      onMouseEnter={(e) => {
                        setHoveredRowId(item.dxCall);
                        onHoverSpot(item, e, accentColor);
                      }}
                      onMouseLeave={() => {
                        setHoveredRowId(null);
                        onHoverSpot(null);
                      }}
                      style={{
                        backgroundColor: isAlerted
                          ? hexToRgba(accentColor, 0.24)
                          : isClosest 
                          ? hexToRgba(accentColor, 0.22) 
                          : isHovered 
                          ? hexToRgba(accentColor, 0.12) 
                          : 'transparent',
                        borderLeft: isAlerted
                          ? `3px solid ${accentColor}`
                          : isClosest 
                          ? `3px solid ${accentColor}` 
                          : isHovered 
                          ? `3px solid ${hexToRgba(accentColor, 0.65)}` 
                          : '3px solid transparent',
                        boxShadow: isAlerted 
                          ? `inset 0 0 0 1.5px ${accentColor}, 0 0 14px ${hexToRgba(accentColor, 0.45)}` 
                          : undefined
                      }}
                      className={`transition-colors border-b border-white/[0.03] cursor-default group/row relative align-middle ${
                        isAlerted ? 'animate-pulse z-10' : ''
                      }`}
                    >
                      {/* Frequenz: Vertikal zentriert, immer 3 Nachkommastellen */}
                      <td 
                        className="py-1.5 pl-1 pr-1 font-bold font-mono align-middle whitespace-nowrap leading-none text-[14px] sm:text-[15px]"
                        style={{
                          color: isAlerted ? '#ffffff' : (isClosest || isHovered ? '#ffffff' : hexToRgba(accentColor, 0.95)),
                          textDecoration: isClosest ? 'underline' : 'none',
                          textDecorationColor: accentColor
                        }}
                      >
                        {item.frequency.toFixed(3)}
                      </td>

                      {/* Rufzeichen & Flagge & Alarm-Glocke */}
                      <td className="py-1.5 px-1 align-middle min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 leading-none">
                          {showFlags && (
                            <span 
                              className="hidden sm:inline-block text-lg leading-none shrink-0 select-none drop-shadow-xs" 
                              title={dxCountry.code && dxCountry.code !== 'UN' ? `${dxCountry.name} (${dxCountry.code})` : dxCountry.name}
                            >
                              {dxCountry.flag}
                            </span>
                          )}
                          <span 
                            className={`truncate font-bold tracking-tight text-[14.5px] sm:text-[16px] ${
                              isWorked ? 'text-green-500' : 
                              item.isManual ? 'text-yellow-400' : 
                              isAlerted ? 'font-extrabold text-white' :
                              'text-text-main'
                            }`}
                            style={{
                              color: isAlerted && !isWorked ? '#ffffff' : undefined,
                              textShadow: isAlerted && !isWorked ? `0 0 8px ${hexToRgba(accentColor, 0.7)}` : undefined
                            }}
                          >
                            {item.dxCall}
                          </span>

                          {/* Glocken-Icon für visuellen Spot-Alarm */}
                          <button
                            type="button"
                            disabled={isWorked}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isWorked) {
                                onToggleAlert(spotKey);
                              }
                            }}
                            title={
                              isWorked 
                                ? "Station bereits gearbeitet (QSO geloggt)" 
                                : isAlerted 
                                ? "Alarm-Markierung deaktivieren" 
                                : `Visuelle Markierung (${config.band}) aktivieren`
                            }
                            className={`p-0.5 ml-auto shrink-0 rounded transition-all cursor-pointer ${
                              isWorked
                                ? "opacity-0 pointer-events-none"
                                : isAlerted
                                ? "opacity-100 scale-110 hover:opacity-80"
                                : "text-text-dim opacity-0 group-hover/row:opacity-50 hover:!opacity-100"
                            }`}
                            style={{
                              color: isAlerted ? accentColor : undefined,
                              filter: isAlerted ? `drop-shadow(0 0 6px ${hexToRgba(accentColor, 0.8)})` : undefined
                            }}
                          >
                            <Bell size={12} style={{ fill: isAlerted ? accentColor : 'none' }} />
                          </button>
                        </div>
                      </td>

                      {/* Richtung (QTE), Entfernung (QRB) & Locator: Entfernung erst ab md sichtbar, Richtung immer sichtbar */}
                      <td className="py-1.5 pr-1 pl-1 text-right align-middle font-mono whitespace-nowrap">
                        {item.bearing !== undefined ? (
                          <div className="flex flex-col items-end gap-1 my-0.5 leading-none">
                            {/* Zeile 1: Richtung & Entfernung (Entfernung nur ab sm/md) */}
                            <div className="flex items-center justify-end gap-1.5">
                              {item.distance !== undefined && (
                                <span className="hidden md:inline-block text-white/80 text-[11px] font-semibold">
                                  {item.distance} <span className="text-[9px] text-text-dim font-normal">km</span>
                                </span>
                              )}
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 shadow-xs" 
                                style={{
                                  backgroundColor: hexToRgba(accentColor, 0.18),
                                  border: `1px solid ${hexToRgba(accentColor, 0.38)}`,
                                  color: accentColor
                                }}
                                title={`Richtung (QTE): ${item.bearing}°${item.distance !== undefined ? ` | ${item.distance} km` : ''}${item.locator ? ` | Locator: ${item.locator}` : ''}`}
                              >
                                <ArrowUp 
                                  size={12} 
                                  className="shrink-0" 
                                  style={{ 
                                    transform: `rotate(${item.bearing}deg)`,
                                    color: accentColor 
                                  }} 
                                />
                                <span>{item.bearing}°</span>
                              </span>
                            </div>
                            {/* Zeile 2: Locator (falls vorhanden) */}
                            {item.locator && (
                              <div className="flex items-center justify-end">
                                <span className="text-white/70 font-mono text-[10px] bg-white/5 px-1 py-0.5 rounded border border-white/10 tracking-wider">
                                  {item.locator}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : item.locator ? (
                          <div className="flex flex-col items-end gap-0.5 my-0.5 leading-none">
                            <span className="text-white font-mono text-[11px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 tracking-wider">
                              {item.locator}
                            </span>
                          </div>
                        ) : (
                          <span className="opacity-20 text-[12px]">-</span>
                        )}
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
  const [hoveredSpot, setHoveredSpot] = useState<{ spot: DxSpot, x: number, y: number, color?: string } | null>(null);
  const [alertedSpotKeys, setAlertedSpotKeys] = useState<Set<string>>(new Set());
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

  // Auto-deactivate spot alert if station is worked
  useEffect(() => {
    if (!workedQSOs || Object.keys(workedQSOs).length === 0) return;
    
    setAlertedSpotKeys(prev => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set(prev);
      
      const allWorked = new Set<string>();
      Object.values(workedQSOs).forEach((calls: string[]) => {
        if (Array.isArray(calls)) {
          calls.forEach(c => allWorked.add(c.toUpperCase()));
        }
      });

      prev.forEach(key => {
        // check if key is spot ID or direct callsign
        const spot = spots.find(s => s.id === key || s.dxCall === key);
        const call = spot ? spot.dxCall.toUpperCase() : key.toUpperCase();
        if (allWorked.has(call)) {
          next.delete(key);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [workedQSOs, spots]);

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

  const handleHoverSpot = (spot: DxSpot | null, e?: React.MouseEvent, color?: string) => {
    if (!spot || !e) {
      setHoveredSpot(null);
      return;
    }
    
    // Position the tooltip near the mouse, but ensure it stays within viewport
    const x = Math.min(e.clientX + 10, window.innerWidth - 340);
    const y = Math.min(e.clientY + 10, window.innerHeight - 340);
    
    setHoveredSpot({ spot, x, y, color: color || '#38bdf8' });
  };

  const toggleSpotAlert = (key: string) => {
    setAlertedSpotKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!config) return (
    <div className="h-screen bg-brand-bg flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.2em] text-brand-accent">
      <div className="flex items-center gap-3">
        <Radio size={20} className="animate-spin" />
        BOOTING MULTI-BANDMAP SYSTEM v0.3.1...
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
              <span className="text-[9px] font-mono text-text-dim opacity-60">v0.3.1</span>
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
                    {config.columns.map((col, idx) => {
                      const colColor = getColumnColor(col, idx);
                      return (
                        <button 
                          key={col.id}
                          onClick={() => toggleColumn(col.id)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-brand-elevated transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20 shadow-xs" 
                              style={{ backgroundColor: colColor }}
                            />
                            <span className="text-[11px] text-text-dim group-hover:text-white truncate">
                              {col.title} ({col.band})
                            </span>
                          </div>
                          {col.visible ? <Eye size={13} style={{ color: colColor }} /> : <EyeOff size={13} className="text-text-dim opacity-50" />}
                        </button>
                      );
                    })}
                    <div className="border-t border-brand-border mt-1 pt-1 space-y-0.5">
                      <div className="text-[10px] uppercase font-bold text-text-dim px-3 py-1">Elemente</div>
                      <button 
                        onClick={() => saveConfig({ ...config, showFlags: config.showFlags !== false ? false : true })}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-brand-elevated transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Flag size={13} className={config.showFlags !== false ? "text-brand-accent" : "text-text-dim opacity-50"} />
                          <span className="text-[11px] text-text-dim group-hover:text-white truncate">
                            Landesflaggen
                          </span>
                        </div>
                        {config.showFlags !== false ? <Eye size={13} className="text-brand-accent" /> : <EyeOff size={13} className="text-text-dim opacity-50" />}
                      </button>

                      <button 
                        onClick={toggleBottomArea}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-brand-elevated transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-text-dim group-hover:text-white">System Konsole</span>
                        </div>
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
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] text-text-dim">Eigener QTH Locator</label>
                      <input 
                        type="text"
                        className="w-full bg-brand-elevated border border-brand-border rounded px-2 py-1 text-[11px] text-white focus:border-brand-accent outline-none uppercase font-mono"
                        value={config.qthLocator || ""}
                        onChange={(e) => setConfig({...config, qthLocator: e.target.value.toUpperCase()})}
                        onBlur={() => saveConfig(config)}
                        placeholder="z.B. JO62VO"
                      />
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
        <div className="flex-1 flex overflow-x-auto min-h-0 bg-brand-bg w-full scrollbar-thin scrollbar-thumb-brand-border">
          <AnimatePresence mode="popLayout">
            {config.columns
              .filter(col => col.visible)
              .map((col, idx) => (
                <BandColumn 
                  key={col.id}
                  config={col}
                  columnIndex={idx}
                  spots={spots}
                  workedQSOs={workedQSOs}
                  showFlags={config.showFlags !== false}
                  alertedSpotKeys={alertedSpotKeys}
                  onToggleAlert={toggleSpotAlert}
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
          <span className="text-brand-accent">
            {config?.clusterCallsign || 'GUEST'}{config?.qthLocator ? ` [${config.qthLocator}]` : ''}
          </span>
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
            style={{ 
              left: hoveredSpot.x, 
              top: hoveredSpot.y,
              borderColor: hexToRgba(hoveredSpot.color || '#38bdf8', 0.4),
              borderTop: `3px solid ${hoveredSpot.color || '#38bdf8'}`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 24px ${hexToRgba(hoveredSpot.color || '#38bdf8', 0.15)}`
            }}
            className="fixed z-[999] w-80 bg-brand-surface border p-3.5 pointer-events-none backdrop-blur-2xl transition-all duration-75 rounded-b-md"
          >
            {(() => {
              const tooltipColor = hoveredSpot.color || '#38bdf8';
              const dxCountry = getCountryInfoByCallsign(hoveredSpot.spot.dxCall);
              const spotterCountry = getCountryInfoByCallsign(hoveredSpot.spot.spotterCall);
              const time = new Date(hoveredSpot.spot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <>
                  <div 
                    className="text-[13px] font-bold mb-3 uppercase tracking-[0.1em] pb-1.5 flex justify-between items-center"
                    style={{ 
                      color: tooltipColor, 
                      borderBottom: `1px solid ${hexToRgba(tooltipColor, 0.25)}` 
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>Spot Details</span>
                      {hoveredSpot.spot.isManual && (
                        <span className="bg-yellow-500/20 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded border border-yellow-500/30 animate-pulse font-normal">
                          MANUELL
                        </span>
                      )}
                    </div>
                    <span className="text-white/50 font-mono text-[11px] font-normal">{time} UTC</span>
                  </div>
                  <div className="space-y-3.5 text-[14px]">
                    <div>
                      <div className="text-text-dim text-[11px] uppercase tracking-wider mb-1">Station Info</div>
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-md border border-white/5">
                        <span className="text-3xl shrink-0 leading-none drop-shadow-sm select-none">{dxCountry.flag}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-bold text-lg leading-tight truncate">{hoveredSpot.spot.dxCall}</div>
                          <div className="text-[12px] text-text-dim truncate mt-0.5">
                            <span className="text-white/90 font-medium">{dxCountry.name}</span>
                            {dxCountry.code && dxCountry.code !== 'UN' && (
                              <span className="opacity-60 text-[10px] ml-1.5 font-mono">[{dxCountry.code}]</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="bg-white/2 pb-1 border-b border-white/5">
                         <div className="text-text-dim text-[11px] uppercase tracking-wider">Frequenz</div>
                         <div className="font-mono text-lg font-bold" style={{ color: tooltipColor }}>
                           {(hoveredSpot.spot.frequency * 1000).toFixed(1)} kHz
                         </div>
                       </div>
                       <div className="bg-white/2 pb-1 border-b border-white/5">
                         <div className="text-text-dim text-[11px] uppercase tracking-wider">Zeit (UTC)</div>
                         <div className="text-white font-mono text-lg font-semibold">{time}</div>
                       </div>
                    </div>

                    {hoveredSpot.spot.locator && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 space-y-2">
                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                          <span className="text-text-dim text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                            <Compass size={13} style={{ color: tooltipColor }} />
                            QTH Locator
                          </span>
                          <span 
                            className="font-mono font-bold text-base px-2 py-0.5 rounded tracking-wider"
                            style={{
                              backgroundColor: hexToRgba(tooltipColor, 0.15),
                              border: `1px solid ${hexToRgba(tooltipColor, 0.35)}`,
                              color: tooltipColor
                            }}
                          >
                            {hoveredSpot.spot.locator}
                          </span>
                        </div>
                        {hoveredSpot.spot.distance !== undefined && (
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <div className="bg-black/20 rounded p-2 border border-white/5">
                              <div className="text-text-dim text-[10px] uppercase tracking-wider">Entfernung (QRB)</div>
                              <div className="text-white font-mono font-bold text-base mt-0.5 flex items-baseline gap-1">
                                <span className="text-lg font-bold" style={{ color: tooltipColor }}>{hoveredSpot.spot.distance}</span>
                                <span className="text-[12px] text-text-dim font-normal">km</span>
                              </div>
                            </div>
                            {hoveredSpot.spot.bearing !== undefined && (
                              <div className="bg-black/20 rounded p-2 border border-white/5">
                                <div className="text-text-dim text-[10px] uppercase tracking-wider">Richtung (QTE)</div>
                                <div className="text-white font-mono font-bold text-base mt-0.5 flex items-center gap-2">
                                  <span 
                                    className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 shadow-sm"
                                    style={{
                                      backgroundColor: hexToRgba(tooltipColor, 0.2),
                                      border: `1px solid ${hexToRgba(tooltipColor, 0.35)}`
                                    }}
                                  >
                                    <ArrowUp 
                                      size={14} 
                                      style={{ 
                                        transform: `rotate(${hoveredSpot.spot.bearing}deg)`,
                                        color: tooltipColor
                                      }} 
                                    />
                                  </span>
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="text-lg font-bold" style={{ color: tooltipColor }}>{hoveredSpot.spot.bearing}°</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-white/2 rounded p-2 border border-white/5">
                      <div className="text-text-dim text-[11px] uppercase tracking-wider mb-1">Spotter</div>
                      <div className="flex items-center gap-2.5 text-[13px]">
                        <span className="text-xl leading-none shrink-0 select-none drop-shadow-xs">{spotterCountry.flag}</span>
                        <span className="text-white font-semibold font-mono">{hoveredSpot.spot.spotterCall}</span>
                        <span className="text-[12px] text-text-dim truncate">
                          ({spotterCountry.name})
                        </span>
                      </div>
                    </div>

                    {hoveredSpot.spot.info && (
                      <div 
                        className="p-2 rounded-md text-[12px] text-text-main italic leading-relaxed"
                        style={{
                          backgroundColor: hexToRgba(tooltipColor, 0.08),
                          border: `1px solid ${hexToRgba(tooltipColor, 0.2)}`,
                          borderLeft: `4px solid ${tooltipColor}`
                        }}
                      >
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
