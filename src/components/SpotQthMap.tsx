import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, Maximize2, MapPin, Radio, Compass } from "lucide-react";
import { locatorToLatLng, getGreatCirclePoints } from "../utils/locator";

interface SpotQthMapProps {
  ownLocator?: string;
  ownCallsign?: string;
  dxLocator: string;
  dxCall: string;
  accentColor?: string;
  distanceKm?: number;
  bearingDeg?: number;
}

export const SpotQthMap: React.FC<SpotQthMapProps> = ({
  ownLocator,
  ownCallsign,
  dxLocator,
  dxCall,
  accentColor = "#38bdf8",
  distanceKm,
  bearingDeg,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const ownPos = locatorToLatLng(ownLocator);
  const dxPos = locatorToLatLng(dxLocator);

  const resetView = () => {
    const map = mapInstanceRef.current;
    if (!map || !dxPos) return;

    if (ownPos) {
      const bounds = L.latLngBounds([
        [ownPos.lat, ownPos.lng],
        [dxPos.lat, dxPos.lng],
      ]);
      map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: 11,
        animate: true,
      });
    } else {
      map.setView([dxPos.lat, dxPos.lng], 6, { animate: true });
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!dxPos) {
      setLoadError("Ungültiger DX-Locator");
      return;
    }

    // Clean up previous instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const container = mapContainerRef.current;

    // Initialize Leaflet Map
    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      worldCopyJump: true,
    });
    mapInstanceRef.current = map;

    // CartoDB Dark Matter Tile Layer
    const tileLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 18,
        minZoom: 1,
      }
    );
    tileLayer.addTo(map);

    // Create custom SVG/HTML DivIcons
    const dxPinHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <span class="absolute w-6 h-6 rounded-full animate-ping opacity-60" style="background-color: ${accentColor};"></span>
        <div class="w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white font-bold text-[9px] z-10" style="background-color: ${accentColor};">
          DX
        </div>
      </div>
    `;

    const dxIcon = L.divIcon({
      html: dxPinHtml,
      className: "custom-dx-marker",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const dxMarker = L.marker([dxPos.lat, dxPos.lng], { icon: dxIcon }).addTo(map);
    dxMarker.bindTooltip(
      `<div class="font-mono text-xs font-bold text-white px-1.5 py-0.5 rounded shadow" style="background: #161B22; border: 1px solid ${accentColor};">
        <span style="color: ${accentColor}">${dxCall}</span> [${dxLocator}]
      </div>`,
      { permanent: false, direction: "top", offset: [0, -10], opacity: 0.95 }
    );

    if (ownPos) {
      const homePinHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <span class="absolute w-5 h-5 rounded-full animate-pulse opacity-40 bg-emerald-400"></span>
          <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-md text-white font-bold text-[8px] z-10">
            QTH
          </div>
        </div>
      `;

      const homeIcon = L.divIcon({
        html: homePinHtml,
        className: "custom-home-marker",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const homeMarker = L.marker([ownPos.lat, ownPos.lng], { icon: homeIcon }).addTo(map);
      homeMarker.bindTooltip(
        `<div class="font-mono text-xs font-bold text-emerald-400 bg-[#161B22] border border-emerald-500/50 px-1.5 py-0.5 rounded shadow">
          ${ownCallsign || "Mein QTH"} [${ownLocator}]
        </div>`,
        { permanent: false, direction: "top", offset: [0, -8], opacity: 0.95 }
      );

      // Great circle path line
      const gcPoints = getGreatCirclePoints(ownPos.lat, ownPos.lng, dxPos.lat, dxPos.lng, 35);
      
      // Glow underlay
      L.polyline(gcPoints, {
        color: accentColor,
        weight: 5,
        opacity: 0.25,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Dashed main line
      L.polyline(gcPoints, {
        color: accentColor,
        weight: 2.5,
        opacity: 0.9,
        dashArray: "6, 6",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Initial Fit Bounds
      const bounds = L.latLngBounds([
        [ownPos.lat, ownPos.lng],
        [dxPos.lat, dxPos.lng],
      ]);
      map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: 10,
        animate: false,
      });
    } else {
      map.setView([dxPos.lat, dxPos.lng], 6, { animate: false });
    }

    // Invalidate size once rendered inside tooltip
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 60);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ownLocator, ownCallsign, dxLocator, dxCall, accentColor]);

  if (loadError || !dxPos) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-md p-3 text-center text-xs text-text-dim">
        Karte kann nicht geladen werden ({loadError || "Kein gültiger Locator"})
      </div>
    );
  }

  return (
    <div className="relative w-full h-[165px] rounded-lg overflow-hidden border border-white/15 shadow-inner bg-[#0B0F14] group">
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Floating Map Badges: Info Overlays */}
      <div className="absolute bottom-1.5 left-1.5 z-[400] flex items-center gap-1.5 pointer-events-none">
        <span 
          className="text-[10px] font-mono px-1.5 py-0.5 rounded shadow-md backdrop-blur-md font-semibold text-white/90 border"
          style={{
            backgroundColor: "rgba(22, 27, 34, 0.85)",
            borderColor: "rgba(255, 255, 255, 0.15)",
          }}
        >
          {dxCall} &bull; {dxLocator}
        </span>
        {distanceKm !== undefined && (
          <span 
            className="text-[10px] font-mono px-1.5 py-0.5 rounded shadow-md backdrop-blur-md font-bold border"
            style={{
              backgroundColor: "rgba(22, 27, 34, 0.85)",
              borderColor: `${accentColor}55`,
              color: accentColor,
            }}
          >
            {distanceKm} km {bearingDeg !== undefined ? `• ${bearingDeg}°` : ""}
          </span>
        )}
      </div>

      {/* Floating Zoom & Controls */}
      <div className="absolute top-1.5 right-1.5 z-[400] flex flex-col gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          title="Vergrößern"
          className="w-6 h-6 rounded bg-brand-surface/90 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center text-xs transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-sm"
        >
          <Plus size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          title="Verkleinern"
          className="w-6 h-6 rounded bg-brand-surface/90 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center text-xs transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-sm"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            resetView();
          }}
          title="Ansicht zurücksetzen (Optimaler Zoom)"
          className="w-6 h-6 rounded bg-brand-surface/90 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center text-xs transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-sm"
        >
          <Maximize2 size={11} />
        </button>
      </div>

      {/* Attribution mini watermark */}
      <div className="absolute bottom-0.5 right-1 z-[400] text-[8px] font-mono text-white/30 pointer-events-none select-none">
        &copy; CARTO &copy; OSM
      </div>
    </div>
  );
};
