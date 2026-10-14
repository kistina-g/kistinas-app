import express from "express";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, "public")));

const MTA_BASE =
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/";
const FEEDS = {
  numbered: { label: "1 2 3 4 5 6 7 S", path: "nyct%2Fgtfs", lines: ["1","2","3","4","5","6","7","S","GS","FS"] },
  ace:      { label: "A C E", path: "nyct%2Fgtfs-ace", lines: ["A","C","E","H","FS"] },
  bdfm:     { label: "B D F M", path: "nyct%2Fgtfs-bdfm", lines: ["B","D","F","M"] },
  g:        { label: "G", path: "nyct%2Fgtfs-g", lines: ["G"] },
  jz:       { label: "J Z", path: "nyct%2Fgtfs-jz", lines: ["J","Z"] },
  l:        { label: "L", path: "nyct%2Fgtfs-l", lines: ["L"] },
  nqrw:     { label: "N Q R W", path: "nyct%2Fgtfs-nqrw", lines: ["N","Q","R","W"] },
  si:       { label: "Staten Island Railway", path: "nyct%2Fgtfs-si", lines: ["SI"] }
};

// Small in-memory cache keeps refreshes from repeatedly downloading identical feeds.
const cache = new Map();
const CACHE_MS = 20_000;
const FETCH_TIMEOUT_MS = 12_000;

async function fetchFeed(key, config) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return { ...cached.data, cached: true };
  }

  const response = await fetch(MTA_BASE + config.path, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "NYC-Subway-Status/1.0 (personal project)" }
  });

  if (!response.ok) {
    throw new Error(`MTA feed ${key} returned HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
  const generatedAt = Number(feed.header?.timestamp || 0);

  const trips = [];
  const alerts = [];

  for (const entity of feed.entity || []) {
    if (entity.tripUpdate) {
      const update = entity.tripUpdate;
      const route = String(update.trip?.routeId || "").toUpperCase();
      const tripId = String(update.trip?.tripId || "");
      const directionId = update.trip?.directionId;
      const stops = (update.stopTimeUpdate || []).map(stop => {
        const arrival = stop.arrival?.time != null ? Number(stop.arrival.time) : null;
        const departure = stop.departure?.time != null ? Number(stop.departure.time) : null;
        const timestamp = arrival ?? departure;
        return {
          stopId: stop.stopId || null,
          arrivalTime: timestamp,
          arrivalIso: timestamp ? new Date(timestamp * 1000).toISOString() : null,
          delaySeconds: stop.arrival?.delay ?? stop.departure?.delay ?? null,
          scheduleRelationship: stop.scheduleRelationship == null
            ? "SCHEDULED"
            : String(stop.scheduleRelationship)
        };
      }).filter(stop => stop.arrivalTime && stop.arrivalTime * 1000 > Date.now() - 60_000);

      trips.push({
        id: entity.id,
        route: route || "(unknown)",
        tripId,
        directionId: directionId == null ? null : Number(directionId),
        startDate: update.trip?.startDate || null,
        startTime: update.trip?.startTime || null,
        stops
      });
    }

    if (entity.alert) {
      const alert = entity.alert;
      const translated = value => {
        const item = value?.translation?.find(t => t.language === "en") || value?.translation?.[0];
        return item?.text || "";
      };
      const affectedRoutes = [...new Set((alert.informedEntity || [])
        .map(item => item.routeId).filter(Boolean).map(String))];
      alerts.push({
        id: entity.id,
        header: translated(alert.headerText) || "Service alert",
        description: translated(alert.descriptionText),
        url: translated(alert.url),
        affectedRoutes
      });
    }
  }

  const data = {
    feed: key,
    feedLabel: config.label,
    lines: config.lines,
    generatedAt: generatedAt ? new Date(generatedAt * 1000).toISOString() : null,
    fetchedAt: new Date().toISOString(),
    trips,
    alerts
  };
  cache.set(key, { fetchedAt: Date.now(), data });
  return data;
}

app.get("/api/status", async (_req, res) => {
  const results = await Promise.allSettled(
    Object.entries(FEEDS).map(([key, config]) => fetchFeed(key, config))
  );

  const feeds = [];
  const errors = [];
  results.forEach((result, index) => {
    const key = Object.keys(FEEDS)[index];
    if (result.status === "fulfilled") {
      feeds.push(result.value);
    } else {
      const cached = cache.get(key);
      if (cached) {
        feeds.push({ ...cached.data, stale: true, error: result.reason?.message || "Feed unavailable" });
      } else {
        errors.push({ feed: key, error: result.reason?.message || "Feed unavailable" });
      }
    }
  });

  res.set("Cache-Control", "no-store");
  res.json({
    updatedAt: new Date().toISOString(),
    source: "MTA GTFS-Realtime",
    feeds,
    errors
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", source: "MTA GTFS-Realtime", feedCount: Object.keys(FEEDS).length });
});

app.listen(PORT, () => {
  console.log(`NYC Subway Status running at http://localhost:${PORT}`);
});
