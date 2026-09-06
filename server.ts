import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import net from "net";
import { createServer } from "http";
import { BAND_FREQUENCIES } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, "config.json");
const SPOTS_FILE = path.join(__dirname, "spots.json");
const QSO_FILE = path.join(__dirname, "worked_qsos.json");
const DATABASE_FILE = path.join(__dirname, "database.txt");

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // --- Persistence ---
  const defaultConfig = {
    columns: [
      { id: "col1", title: "Kanal 1", band: "2m", visible: true, color: "#38bdf8" },
      { id: "col2", title: "Kanal 2", band: "70cm", visible: true, color: "#10b981" },
      { id: "col3", title: "Kanal 3", band: "23cm", visible: true, color: "#f59e0b" },
      { id: "col4", title: "Kanal 4", band: "13cm", visible: true, color: "#f43f5e" },
      { id: "col5", title: "Kanal 5", band: "3cm", visible: true, color: "#a855f7" },
    ],
    bottomAreaVisible: true,
    retentionHours: 4,
    autoBandSwitch: true,
    clusterHost: "dx.da0bcc.de",
    clusterPort: 7300,
    clusterCallsign: "DF0OT",
    qthLocator: "JO62VO",
    showFlags: true,
    alertSound: true,
    showSpotMap: true
  };

  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }

  const loadConfig = () => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const loaded = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
        return { ...defaultConfig, ...loaded };
      }
    } catch (e) {
      console.error("Error loading config:", e);
    }
    return defaultConfig;
  };

  let spots: any[] = [];
  if (fs.existsSync(SPOTS_FILE)) {
    try {
      spots = JSON.parse(fs.readFileSync(SPOTS_FILE, "utf-8"));
    } catch (e) {
      spots = [];
    }
  }

  let workedQSOs: Record<string, string[]> = {};
  if (fs.existsSync(QSO_FILE)) {
    try {
      workedQSOs = JSON.parse(fs.readFileSync(QSO_FILE, "utf-8"));
    } catch (e) {
      workedQSOs = {};
    }
  }

  // --- QTH Locator Database & Math Helper ---
  let callsignToLocatorMap: Record<string, string> = {};
  const loadDatabase = () => {
    try {
      if (fs.existsSync(DATABASE_FILE)) {
        const lines = fs.readFileSync(DATABASE_FILE, "utf-8").split(/\r?\n/);
        const map: Record<string, string> = {};
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 2) {
            map[parts[0].toUpperCase()] = parts[1].toUpperCase();
          }
        }
        callsignToLocatorMap = map;
        console.log(`[DATABASE] Loaded ${Object.keys(map).length} callsign mappings from database.txt`);
      }
    } catch (e) {
      console.error("Error loading database.txt:", e);
    }
  };
  loadDatabase();

  const locatorToLatLng = (locator: string): { lat: number; lng: number } | null => {
    if (!locator || locator.length < 4) return null;
    const loc = locator.toUpperCase();
    const A = "A".charCodeAt(0);
    
    let lng = (loc.charCodeAt(0) - A) * 20 - 180;
    let lat = (loc.charCodeAt(1) - A) * 10 - 90;
    
    lng += parseInt(loc[2], 10) * 2;
    lat += parseInt(loc[3], 10) * 1;
    
    if (loc.length >= 6) {
      const a = "A".charCodeAt(0);
      lng += (loc.charCodeAt(4) - a) * (2 / 24) + (1 / 24);
      lat += (loc.charCodeAt(5) - a) * (1 / 24) + (0.5 / 24);
    } else {
      lng += 1;
      lat += 0.5;
    }
    return { lat, lng };
  };

  const calculateDistanceAndBearing = (loc1?: string, loc2?: string): { distance: number; bearing: number } | null => {
    if (!loc1 || !loc2) return null;
    const c1 = locatorToLatLng(loc1);
    const c2 = locatorToLatLng(loc2);
    if (!c1 || !c2) return null;

    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;

    const lat1 = toRad(c1.lat);
    const lon1 = toRad(c1.lng);
    const lat2 = toRad(c2.lat);
    const lon2 = toRad(c2.lng);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const R = 6371; // Earth radius in km
    const distance = Math.round(R * c);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = Math.round((toDeg(Math.atan2(y, x)) + 360) % 360);

    return { distance, bearing };
  };

  const enrichSpotWithLocator = (spot: any) => {
    const cleanCall = spot.dxCall?.split("/")[0]?.toUpperCase() || spot.dxCall?.toUpperCase();
    let locator = callsignToLocatorMap[cleanCall] || callsignToLocatorMap[spot.dxCall?.toUpperCase()];
    
    // Also check if spot info contains a Maidenhead grid locator (e.g. JO62, JO62qj, FM18, etc.)
    if (!locator && spot.info) {
      const locatorMatch = spot.info.match(/\b([A-R]{2}\d{2}([A-X]{2})?)\b/i);
      if (locatorMatch) {
        locator = locatorMatch[1].toUpperCase();
      }
    }

    if (locator) {
      spot.locator = locator;
      const config = loadConfig();
      if (config.qthLocator) {
        const geo = calculateDistanceAndBearing(config.qthLocator, locator);
        if (geo) {
          spot.distance = geo.distance;
          spot.bearing = geo.bearing;
        } else {
          delete spot.distance;
          delete spot.bearing;
        }
      } else {
        delete spot.distance;
        delete spot.bearing;
      }
    } else {
      delete spot.locator;
      delete spot.distance;
      delete spot.bearing;
    }
    return spot;
  };

  // Re-enrich existing loaded spots from file on boot
  spots = spots.map(enrichSpotWithLocator);

  const saveSpots = () => {
    fs.writeFileSync(SPOTS_FILE, JSON.stringify(spots, null, 2));
  };

  const saveWorkedQSOs = () => {
    fs.writeFileSync(QSO_FILE, JSON.stringify(workedQSOs, null, 2));
  };

  const getRetentionHours = () => {
    const config = loadConfig();
    return config.retentionHours || 4;
  };

  const cleanupSpots = () => {
    const hours = getRetentionHours();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const originalCount = spots.length;
    spots = spots.filter(spot => new Date(spot.timestamp).getTime() > cutoff);
    if (spots.length !== originalCount) {
      saveSpots();
      broadcast({ type: "spots:init", spots });
    }
  };

  setInterval(cleanupSpots, 5 * 60 * 1000); // Cleanup every 5 mins

  app.get("/api/spots/history/:call", (req, res) => {
    try {
      const targetCall = req.params.call?.trim().toUpperCase();
      if (!targetCall) {
        return res.status(400).json({ error: "Missing callsign" });
      }
      const history = spots
        .filter(s => s.dxCall.toUpperCase() === targetCall)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Could not fetch spot history" });
    }
  });

  app.get("/api/config", (req, res) => {
    try {
      res.json(loadConfig());
    } catch (error) {
      res.status(500).json({ error: "Could not read config" });
    }
  });

  app.post("/api/config", (req, res) => {
    try {
      const oldConfig = loadConfig();
      const newConfig = req.body;
      
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
      cleanupSpots(); // Run immediate cleanup if retention hours changed
      
      // Re-enrich spots if QTH locator changed
      if (oldConfig.qthLocator !== newConfig.qthLocator) {
        spots = spots.map(enrichSpotWithLocator);
        saveSpots();
        broadcast({ type: "spots:init", spots });
      }

      // If cluster settings changed, reconnect
      if (
        oldConfig.clusterHost !== newConfig.clusterHost ||
        oldConfig.clusterPort !== newConfig.clusterPort ||
        oldConfig.clusterCallsign !== newConfig.clusterCallsign
      ) {
        console.log("[SERVER] Cluster settings updated, reconnecting...");
        connectToCluster();
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Could not save config" });
    }
  });

  // --- Frequency API ---
  // Format: http://url/api/qrg/x/y where x is column index (1-5) and y is freq in MHz
  app.get("/api/qrg/:column/:freq", (req, res) => {
    const { column, freq } = req.params;
    const colIdx = parseInt(column);
    const freqVal = parseFloat(freq);

    if (isNaN(colIdx) || colIdx < 1 || colIdx > 5 || isNaN(freqVal)) {
      return res.status(400).json({ error: "Invalid parameters. Usage: /api/qrg/[1-5]/[MHz]" });
    }

    const columnId = `col${colIdx}`;
    console.log(`[API] QRG Update: Column ${columnId} -> ${freqVal.toFixed(3)} MHz`);
    
    // Auto Band Switching logic
    let detectedBand: string | null = null;
    try {
      const currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      
      if (currentConfig.autoBandSwitch) {
        // Find which band this freq belongs to
        for (const [bandName, range] of Object.entries(BAND_FREQUENCIES)) {
          if (freqVal >= range.min && freqVal <= range.max) {
            detectedBand = bandName;
            break;
          }
        }
        
        if (detectedBand) {
          const colIndex = currentConfig.columns.findIndex((c: any) => c.id === columnId);
          if (colIndex !== -1 && currentConfig.columns[colIndex].band !== detectedBand) {
            console.log(`[API] Auto Band Switch: ${columnId} changed from ${currentConfig.columns[colIndex].band} to ${detectedBand}`);
            currentConfig.columns[colIndex].band = detectedBand;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
            
            // Broadcast the config update so the UI refreshes the column completely
            broadcast({ type: "config", config: currentConfig });
          }
        }
      }
    } catch (e) {
      console.error("Error during auto band switch:", e);
    }

    broadcast({ 
      type: "column:freq", 
      columnId, 
      frequency: freqVal 
    });

    res.json({ success: true, columnId, frequency: freqVal, autoSwitchedTo: detectedBand });
  });

  // --- Worked QSO API ---
  // Format: http://url/api/qso/band/call/freq?
  app.get("/api/qso/:band/:call/:freq?", (req, res) => {
    const { band, call, freq } = req.params;
    const bandName = band.trim();
    const callsign = call.trim().toUpperCase();

    if (!bandName || !callsign) {
      return res.status(400).json({ error: "Invalid parameters. Usage: /api/qso/[band]/[call]/[optional-freq-mhz]" });
    }

    // Add to worked list
    if (!workedQSOs[bandName]) {
      workedQSOs[bandName] = [];
    }

    if (!workedQSOs[bandName].includes(callsign)) {
      workedQSOs[bandName].push(callsign);
      saveWorkedQSOs();
      console.log(`[API] QSO Added: ${callsign} on ${bandName}`);
      broadcast({ type: "qso:update", workedQSOs });
    }

    // Check for optional frequency to update or create a spot
    if (freq) {
      const fNum = parseFloat(freq);
      if (!isNaN(fNum)) {
        // Find if this callsign already exists in spots
        const existingSpotIndex = spots.findIndex(s => s.dxCall === callsign);
        
        if (existingSpotIndex !== -1) {
          // Update the frequency and timestamp of the existing spot
          // We keep its "cluster" status (isManual: false) if it was one
          spots[existingSpotIndex].frequency = fNum;
          spots[existingSpotIndex].timestamp = new Date().toISOString();
          enrichSpotWithLocator(spots[existingSpotIndex]);
          
          saveSpots();
          console.log(`[API] Existing Spot Updated: ${callsign} to ${fNum} MHz`);
          // Re-broadcast all spots or just an update? Re-init is safer to ensure all bands see the freq change
          broadcast({ type: "spots:init", spots });
        } else {
          // If not in spots, create a manual entry
          const manualSpot = enrichSpotWithLocator({
            id: `m-${Math.random().toString(36).substr(2, 9)}`,
            spotterCall: "DF0OT",
            frequency: fNum,
            dxCall: callsign,
            info: "MANUAL ENTRY",
            timestamp: new Date().toISOString(),
            isManual: true
          });
          spots.push(manualSpot);
          saveSpots();
          console.log(`[API] Manual Spot Created: ${callsign} @ ${fNum} MHz`);
          broadcast({ type: "spot:new", spot: manualSpot });
        }
      }
    }

    res.json({ 
      success: true, 
      band: bandName, 
      call: callsign, 
      totalOnBand: workedQSOs[bandName].length,
      workedCalls: workedQSOs[bandName]
    });
  });

  // Toggle or explicitly set worked status for a callsign on a band
  app.post("/api/qso/toggle", (req, res) => {
    const { band, call, worked } = req.body || {};
    const bandName = (band || "").trim();
    const callsign = (call || "").trim().toUpperCase();

    if (!bandName || !callsign) {
      return res.status(400).json({ error: "band and call are required parameters" });
    }

    if (!workedQSOs[bandName]) {
      workedQSOs[bandName] = [];
    }

    const isCurrentlyWorked = workedQSOs[bandName].includes(callsign);
    const shouldBeWorked = worked !== undefined ? Boolean(worked) : !isCurrentlyWorked;

    if (shouldBeWorked && !isCurrentlyWorked) {
      workedQSOs[bandName].push(callsign);
      saveWorkedQSOs();
      console.log(`[API] QSO Marked as Worked: ${callsign} on ${bandName}`);
      broadcast({ type: "qso:update", workedQSOs });
    } else if (!shouldBeWorked && isCurrentlyWorked) {
      workedQSOs[bandName] = workedQSOs[bandName].filter(c => c !== callsign);
      saveWorkedQSOs();
      console.log(`[API] QSO Unmarked from Worked: ${callsign} on ${bandName}`);
      broadcast({ type: "qso:update", workedQSOs });
    }

    res.json({
      success: true,
      band: bandName,
      call: callsign,
      worked: shouldBeWorked,
      totalOnBand: workedQSOs[bandName].length,
      workedCalls: workedQSOs[bandName]
    });
  });

  app.post("/api/qso/reset", (req, res) => {
    workedQSOs = {};
    saveWorkedQSOs();
    
    // Also remove manual spots
    const originalSpotCount = spots.length;
    spots = spots.filter(s => !s.isManual);
    if (spots.length !== originalSpotCount) {
      saveSpots();
    }
    
    console.log(`[API] Worked QSOs Reset (and Manual Spots removed)`);
    
    // Broadcast reset to all clients
    broadcast({ type: "qso:update", workedQSOs: {} });
    
    // Also re-broadcast current spots to force columns to re-evaluate their contents
    broadcast({ type: "spots:init", spots });
    
    // Add info to history
    const resetMsg = `[SYSTEM] ${new Date().toLocaleTimeString()} - WORKED QSOs RESET BY USER`;
    consoleHistory.push(resetMsg);
    if (consoleHistory.length > MAX_CONSOLE_HISTORY) consoleHistory.shift();
    broadcast({ type: "data", lines: [resetMsg], charCount });

    res.json({ success: true });
  });

  // --- DX Cluster Connection ---
  let clusterStatus = "DISCONNECTED";
  let charCount = 0;
  const consoleHistory: string[] = [];
  const MAX_CONSOLE_HISTORY = 100;
  let activeClusterClient: net.Socket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const broadcast = (data: any) => {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  };

  const connectToCluster = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (activeClusterClient) {
      activeClusterClient.destroy();
      activeClusterClient = null;
    }

    const config = loadConfig();
    clusterStatus = "CONNECTING";
    broadcast({ type: "status", status: clusterStatus });

    console.log(`Connecting to DX Cluster: ${config.clusterHost}:${config.clusterPort}`);
    const client = net.createConnection({ host: config.clusterHost, port: config.clusterPort }, () => {
      console.log("Connected to DX Cluster");
      clusterStatus = "CONNECTED";
      broadcast({ type: "status", status: clusterStatus, loginCall: config.clusterCallsign });
      
      const loginCall = config.clusterCallsign?.trim();
      if (loginCall) {
        console.log(`Logging in as ${loginCall}`);
        client.write(`${loginCall}\r\n`);
      } else {
        console.log("No login callsign provided, skipping login command.");
      }
    });

    activeClusterClient = client;

    let clusterBuffer = "";
    client.on("data", (data) => {
      const str = data.toString();
      charCount += str.length;
      clusterBuffer += str;
      
      const parts = clusterBuffer.split(/\r?\n/);
      clusterBuffer = parts.pop() || ""; // Keep the last part in buffer
      
      if (parts.length === 0) return;

      parts.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        consoleHistory.push(trimmedLine);
        if (consoleHistory.length > MAX_CONSOLE_HISTORY) consoleHistory.shift();

        // Parse DX Spot - very robust regex
        // Format: DX de SPOTTER: FREQ DX-CALL INFO TIMEZ
        // Optional # prefix for some cluster nodes
        const match = trimmedLine.match(/^(?:#\s*)?DX\s+de\s+([^:]+):\s+([\d.]+)\s+([^\s]+)\s+(.*?)\s+(\d{4})\s*Z/i);
        
        if (match) {
          const [, spotterCall, freqStr, dxCall, info, timeStr] = match;
          const freqKHz = parseFloat(freqStr);
          const freqMHz = freqKHz / 1000;
          
          console.log(`[PARSER] Match Success: ${dxCall} @ ${freqMHz.toFixed(3)}MHz (Spotter: ${spotterCall.trim()})`);
          
          const newSpot = enrichSpotWithLocator({
            id: Math.random().toString(36).substr(2, 9),
            spotterCall: spotterCall.trim(),
            frequency: freqMHz,
            dxCall: dxCall.trim(),
            info: info.trim(),
            timestamp: new Date().toISOString()
          });
          spots.push(newSpot);
          saveSpots();
          broadcast({ type: "spot:new", spot: newSpot });
        } else if (/DX\s+de/i.test(trimmedLine)) {
          console.log(`[PARSER] Potential DX Spot failed regex: "${trimmedLine}"`);
        }
      });

      broadcast({ type: "data", lines: parts, charCount });
    });

    client.on("end", () => {
      console.log("Disconnected from DX Cluster");
      clusterStatus = "DISCONNECTED";
      broadcast({ type: "status", status: clusterStatus });
      activeClusterClient = null;
      reconnectTimeout = setTimeout(connectToCluster, 5000); // Reconnect
    });

    client.on("error", (err) => {
      console.error("Cluster connection error:", err.message);
      clusterStatus = "ERROR";
      broadcast({ type: "status", status: clusterStatus, error: err.message });
      client.destroy();
      activeClusterClient = null;
      reconnectTimeout = setTimeout(connectToCluster, 10000);
    });
  };

  connectToCluster();

  // Handle WS connections
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ 
      type: "init", 
      history: consoleHistory, 
      status: clusterStatus, 
      charCount, 
      spots,
      workedQSOs 
    }));
  });

  // --- Vite & Routing ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
