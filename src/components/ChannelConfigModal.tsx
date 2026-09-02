import React from "react";
import { ColumnConfig, BAND_FREQUENCIES, HAM_BANDS, CONTINENTS, DxSpot } from "../types";
import { getContinentByCallsign } from "../dxcc";
import { 
  X, 
  Eye, 
  EyeOff, 
  Filter, 
  Globe, 
  Palette, 
  Check, 
  Sliders, 
  Radio, 
  Sparkles,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChannelConfigModalProps {
  isOpen: boolean;
  channelId: string | null;
  columns: ColumnConfig[];
  spots: DxSpot[];
  onClose: () => void;
  onUpdateColumn: (id: string, updates: Partial<ColumnConfig>) => void;
  onSelectChannel: (id: string) => void;
}

const COLOR_PRESETS = [
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

export const ChannelConfigModal: React.FC<ChannelConfigModalProps> = ({
  isOpen,
  channelId,
  columns,
  spots,
  onClose,
  onUpdateColumn,
  onSelectChannel,
}) => {
  if (!isOpen || !channelId) return null;

  const currentChannel = columns.find((c) => c.id === channelId) || columns[0];
  if (!currentChannel) return null;

  const channelColor = currentChannel.color || "#38bdf8";
  const allowed = currentChannel.allowedContinents || [];
  const filterTarget = currentChannel.continentFilterTarget || "dx";
  const isFiltered = allowed.length > 0 && allowed.length < CONTINENTS.length;

  // Spots stats on this channel's band
  const bandRange = BAND_FREQUENCIES[currentChannel.band];
  const spotsOnBand = React.useMemo(() => {
    if (!bandRange) return [];
    return spots.filter((s) => s.frequency >= bandRange.min && s.frequency <= bandRange.max);
  }, [spots, bandRange]);

  const matchingSpotsCount = React.useMemo(() => {
    if (!isFiltered) return spotsOnBand.length;
    return spotsOnBand.filter((s) => {
      const dxCont = getContinentByCallsign(s.dxCall);
      const spotterCont = getContinentByCallsign(s.spotterCall);
      if (filterTarget === "spotter") return allowed.includes(spotterCont);
      if (filterTarget === "both") return allowed.includes(dxCont) && allowed.includes(spotterCont);
      return allowed.includes(dxCont);
    }).length;
  }, [spotsOnBand, isFiltered, allowed, filterTarget]);

  // Check if band is UKW (VHF/UHF/Microwave)
  const isUkwBand = ["2m", "70cm", "23cm", "13cm", "6cm", "3cm", "4m"].includes(currentChannel.band);

  const toggleContinent = (code: string) => {
    let next: string[];
    if (allowed.length === 0) {
      // If currently no filter, clicking one continent toggles to only that one
      next = [code];
    } else if (allowed.includes(code)) {
      next = allowed.filter((c) => c !== code);
    } else {
      next = [...allowed, code];
    }
    // If all 7 selected, reset to empty (meaning all)
    if (next.length >= CONTINENTS.length) {
      next = [];
    }
    onUpdateColumn(currentChannel.id, { allowedContinents: next });
  };

  const applyPreset = (preset: "europe" | "all" | "eu_na") => {
    if (preset === "europe") {
      onUpdateColumn(currentChannel.id, { allowedContinents: ["EU"] });
    } else if (preset === "all") {
      onUpdateColumn(currentChannel.id, { allowedContinents: [] });
    } else if (preset === "eu_na") {
      onUpdateColumn(currentChannel.id, { allowedContinents: ["EU", "NA"] });
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header with Channel Tabs */}
          <div className="border-b border-brand-border bg-black/40 px-4 pt-3.5 pb-2.5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-xs shrink-0" 
                  style={{ backgroundColor: channelColor }} 
                />
                <div>
                  <h2 className="text-[14px] font-bold text-white flex items-center gap-2">
                    Kanal-Einstellungen & Filter
                    <span 
                      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border"
                      style={{ 
                        color: channelColor, 
                        borderColor: `${channelColor}40`, 
                        backgroundColor: `${channelColor}15` 
                      }}
                    >
                      {currentChannel.title} ({currentChannel.band})
                    </span>
                  </h2>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    Konfiguriere Sichtbarkeit, Kontinent-Filter, Band und Akzentfarbe für diesen Kanal.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-text-dim hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                title="Schließen (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Channel Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {columns.map((col) => {
                const isActive = col.id === currentChannel.id;
                const colColor = col.color || "#38bdf8";
                const hasColFilter = (col.allowedContinents?.length ?? 0) > 0 && (col.allowedContinents?.length ?? 0) < CONTINENTS.length;
                return (
                  <button
                    key={col.id}
                    onClick={() => onSelectChannel(col.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap border shrink-0 ${
                      isActive 
                        ? "bg-brand-elevated text-white border-white/20 shadow-xs" 
                        : "text-text-dim hover:text-white hover:bg-white/5 border-transparent"
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: colColor }} 
                    />
                    <span>{col.title} ({col.band})</span>
                    {hasColFilter && (
                      <span className="text-[9px] bg-brand-accent/20 text-brand-accent px-1 rounded font-mono font-bold">
                        {col.allowedContinents?.join(",")}
                      </span>
                    )}
                    {!col.visible && (
                      <EyeOff size={11} className="text-text-dim opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(92vh-140px)] scrollbar-thin scrollbar-thumb-brand-border">
            
            {/* Section 1: Sichtbarkeit */}
            <div className="bg-brand-elevated/40 border border-brand-border rounded-lg p-3 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${currentChannel.visible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-text-dim'}`}>
                  {currentChannel.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-white flex items-center gap-2">
                    Kanal im Raster anzeigen
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      currentChannel.visible 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : "bg-white/5 text-text-dim border border-white/10"
                    }`}>
                      {currentChannel.visible ? "Sichtbar" : "Ausgeblendet"}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    Schalte die Spalte für {currentChannel.title} in der Hauptansicht ein oder aus.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUpdateColumn(currentChannel.id, { visible: !currentChannel.visible })}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all border shrink-0 ${
                  currentChannel.visible
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                    : "bg-white/10 border-white/20 text-text-dim hover:text-white hover:bg-white/15"
                }`}
              >
                {currentChannel.visible ? "Ausblenden" : "Einblenden"}
              </button>
            </div>

            {/* Section 2: Kontinent-Filter (Core Feature) */}
            <div className="bg-brand-elevated/30 border border-brand-border rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-brand-border pb-2">
                <div className="flex items-center gap-2">
                  <Filter size={15} style={{ color: channelColor }} />
                  <span className="text-[12px] font-bold text-white uppercase tracking-wider">
                    Kontinent-Filter
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 ${
                    isFiltered 
                      ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/30" 
                      : "bg-white/5 text-text-dim border border-white/10"
                  }`}>
                    {isFiltered ? (
                      <>
                        <span>Filter aktiv:</span>
                        <span>{allowed.join(", ")}</span>
                      </>
                    ) : (
                      "Alle Kontinente (Kein Filter)"
                    )}
                  </span>
                  
                  {isFiltered && (
                    <button
                      onClick={() => applyPreset("all")}
                      className="text-[10px] text-text-dim hover:text-white flex items-center gap-1 p-1 hover:bg-white/5 rounded transition-colors"
                      title="Filter zurücksetzen"
                    >
                      <RotateCcw size={11} /> Zurücksetzen
                    </button>
                  )}
                </div>
              </div>

              {/* UKW Hint */}
              {isUkwBand && (
                <div className="bg-sky-950/40 border border-sky-500/30 rounded-md p-2.5 flex items-start gap-2.5 text-sky-200 text-[11px]">
                  <Sparkles size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">UKW-Empfehlung ({currentChannel.band}): </span>
                    Übersee-Meldungen (z.B. aus den USA) sind auf UKW meist unhörbar. Ein Klick auf 
                    <strong className="text-sky-300"> „Nur Europa (EU)“ </strong> 
                    blendet irrelevante Übersee-Spots zuverlässig aus.
                  </div>
                </div>
              )}

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-text-dim tracking-wider">Schnellauswahl:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyPreset("europe")}
                    className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                      allowed.length === 1 && allowed[0] === "EU"
                        ? "bg-brand-accent text-black border-brand-accent shadow-xs"
                        : "bg-brand-elevated text-white border-brand-border hover:border-brand-accent/50 hover:bg-white/5"
                    }`}
                  >
                    <span>🇪🇺</span>
                    <span>Nur Europa (UKW)</span>
                    {allowed.length === 1 && allowed[0] === "EU" && <Check size={12} className="stroke-[3]" />}
                  </button>

                  <button
                    onClick={() => applyPreset("eu_na")}
                    className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                      allowed.length === 2 && allowed.includes("EU") && allowed.includes("NA")
                        ? "bg-brand-accent text-black border-brand-accent shadow-xs"
                        : "bg-brand-elevated text-white border-brand-border hover:border-brand-accent/50 hover:bg-white/5"
                    }`}
                  >
                    <span>🌐</span>
                    <span>Europa & Nordamerika</span>
                    {allowed.length === 2 && allowed.includes("EU") && allowed.includes("NA") && <Check size={12} className="stroke-[3]" />}
                  </button>

                  <button
                    onClick={() => applyPreset("all")}
                    className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                      allowed.length === 0
                        ? "bg-brand-elevated text-brand-accent border-brand-accent/50"
                        : "bg-brand-elevated text-text-dim border-brand-border hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>🌍</span>
                    <span>Alle Kontinente (Kein Filter)</span>
                    {allowed.length === 0 && <Check size={12} />}
                  </button>
                </div>
              </div>

              {/* Individual Continent Checkboxes */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] uppercase font-bold text-text-dim tracking-wider flex items-center justify-between">
                  <span>Kontinente einzeln an-/abwählen:</span>
                  <span className="text-white/60 font-mono font-normal">
                    {matchingSpotsCount} von {spotsOnBand.length} Spots sichtbar
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTINENTS.map((cont) => {
                    const isSelected = allowed.length === 0 || allowed.includes(cont.code);
                    const isExplicitlySelected = allowed.includes(cont.code);
                    return (
                      <button
                        key={cont.code}
                        type="button"
                        onClick={() => toggleContinent(cont.code)}
                        className={`px-2.5 py-2 rounded-lg border text-left flex items-center justify-between transition-all group ${
                          isExplicitlySelected
                            ? "bg-brand-elevated border-brand-accent text-white shadow-xs"
                            : allowed.length === 0
                            ? "bg-white/5 border-white/10 text-white/90 hover:border-white/20"
                            : "bg-black/20 border-brand-border text-text-dim/50 hover:text-text-dim hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[14px] leading-none">{cont.flag}</span>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold truncate leading-tight">
                              {cont.name}
                            </div>
                            <div className="text-[9px] font-mono text-text-dim opacity-70">
                              Code: {cont.code}
                            </div>
                          </div>
                        </div>

                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5 transition-colors ${
                          isSelected
                            ? "bg-brand-accent border-brand-accent text-black"
                            : "border-white/20 bg-black/30"
                        }`}>
                          {isSelected && <Check size={11} className="stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Target Setting */}
              <div className="pt-2 border-t border-brand-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                <span className="text-text-dim">Gefilterte Station:</span>
                <div className="flex items-center gap-1 bg-brand-elevated p-0.5 rounded border border-brand-border">
                  <button
                    type="button"
                    onClick={() => onUpdateColumn(currentChannel.id, { continentFilterTarget: "dx" })}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      filterTarget === "dx"
                        ? "bg-brand-surface text-brand-accent shadow-xs"
                        : "text-text-dim hover:text-white"
                    }`}
                  >
                    DX-Station (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateColumn(currentChannel.id, { continentFilterTarget: "both" })}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      filterTarget === "both"
                        ? "bg-brand-surface text-brand-accent shadow-xs"
                        : "text-text-dim hover:text-white"
                    }`}
                  >
                    DX & Spotter
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateColumn(currentChannel.id, { continentFilterTarget: "spotter" })}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      filterTarget === "spotter"
                        ? "bg-brand-surface text-brand-accent shadow-xs"
                        : "text-text-dim hover:text-white"
                    }`}
                  >
                    Nur Spotter
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Band, Titel & Akzentfarbe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Band selection */}
              <div className="bg-brand-elevated/20 border border-brand-border rounded-lg p-3 space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider block">
                  Amateurfunk-Band
                </label>
                <select
                  value={currentChannel.band}
                  onChange={(e) => onUpdateColumn(currentChannel.id, { band: e.target.value })}
                  className="w-full bg-brand-elevated border border-brand-border rounded px-2.5 py-1.5 text-[12px] text-white focus:border-brand-accent transition-all cursor-pointer outline-none"
                >
                  {HAM_BANDS.map((b) => (
                    <option key={b} value={b}>
                      {b} ({BAND_FREQUENCIES[b]?.min} - {BAND_FREQUENCIES[b]?.max} MHz)
                    </option>
                  ))}
                </select>
                {bandRange && (
                  <div className="text-[10px] font-mono text-text-dim">
                    Bereich: {bandRange.min.toFixed(3)} - {bandRange.max.toFixed(3)} MHz
                  </div>
                )}
              </div>

              {/* Title rename */}
              <div className="bg-brand-elevated/20 border border-brand-border rounded-lg p-3 space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-dim tracking-wider block">
                  Kanal-Bezeichnung
                </label>
                <input
                  type="text"
                  value={currentChannel.title}
                  onChange={(e) => onUpdateColumn(currentChannel.id, { title: e.target.value })}
                  className="w-full bg-brand-elevated border border-brand-border rounded px-2.5 py-1.5 text-[12px] text-white font-bold focus:border-brand-accent transition-all outline-none"
                  placeholder="z.B. Kanal 1 oder UKW 2m"
                />
                <div className="text-[10px] text-text-dim">
                  Eindeutiger Name in Kopfzeile und Menü
                </div>
              </div>
            </div>

            {/* Section 4: Akzentfarbe */}
            <div className="bg-brand-elevated/20 border border-brand-border rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-text-dim tracking-wider flex items-center gap-1.5">
                  <Palette size={12} style={{ color: channelColor }} /> Akzentfarbe für {currentChannel.title}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={channelColor}
                    onChange={(e) => onUpdateColumn(currentChannel.id, { color: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                    title="Eigene Farbe wählen"
                  />
                  <span className="text-[11px] font-mono uppercase text-white/80">{channelColor}</span>
                </div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = channelColor.toLowerCase() === preset.value.toLowerCase();
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => onUpdateColumn(currentChannel.id, { color: preset.value })}
                      className="w-7 h-7 rounded-md border transition-transform hover:scale-110 flex items-center justify-center relative shadow-xs"
                      style={{
                        backgroundColor: preset.value,
                        borderColor: isSelected ? "#ffffff" : "rgba(255,255,255,0.2)"
                      }}
                      title={preset.name}
                    >
                      {isSelected && <Check size={13} className="text-black font-extrabold stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="border-t border-brand-border bg-black/40 px-4 py-3 flex items-center justify-between">
            <div className="text-[11px] text-text-dim flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: channelColor }} 
              />
              <span>Änderungen werden automatisch gespeichert.</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-brand-accent text-black font-bold rounded text-[12px] hover:bg-brand-accent/90 transition-colors shadow-xs"
            >
              Fertig
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
