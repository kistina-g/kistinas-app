const LINE_COLORS = {
  "1":"#EE352E","2":"#EE352E","3":"#EE352E",
  "4":"#00933C","5":"#00933C","6":"#00933C",
  "7":"#B933AD","A":"#0039A6","C":"#0039A6","E":"#0039A6",
  "B":"#FF6319","D":"#FF6319","F":"#FF6319","M":"#FF6319",
  "G":"#6CBE45","J":"#996633","Z":"#996633","L":"#A7A9AC",
  "N":"#FCCC0A","Q":"#FCCC0A","R":"#FCCC0A","W":"#FCCC0A",
  "S":"#808183","GS":"#808183","FS":"#808183","SI":"#0039A6","H":"#0039A6"
};

const el = id => document.getElementById(id);
let latestData = null;
let loading = false;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[ch]);
}
function formatTime(iso) {
  if (!iso) return "Time unavailable";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Time unavailable" :
    date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: undefined });
}
function lineBadge(route) {
  const color = LINE_COLORS[route] || "#4b5563";
  return `<span class="line-badge" style="background:${color}">${escapeHtml(route)}</span>`;
}
function formatRoutes(routes) {
  if (!routes?.length) return "";
  return `<div class="route-tags">${routes.map(route =>
    `<span class="route-tag" style="background:${LINE_COLORS[route] || "#4b5563"}">${escapeHtml(route)}</span>`
  ).join("")}</div>`;
}
function renderAlerts(feeds) {
  const alerts = feeds.flatMap(feed => (feed.alerts || []).map(alert => ({
    ...alert, feedLabel: feed.feedLabel
  })));
  el("alert-count").textContent = alerts.length;
  if (!alerts.length) {
    el("alerts").innerHTML = '<div class="empty">No alerts were included in the feeds successfully loaded. This does not necessarily mean every line is running normally.</div>';
    return;
  }
  el("alerts").innerHTML = alerts.map(alert => `
    <article class="alert-card">
      <div class="alert-title">${escapeHtml(alert.header)}</div>
      ${alert.description ? `<div class="alert-description">${escapeHtml(alert.description)}</div>` : ""}
      ${formatRoutes(alert.affectedRoutes)}
      <div class="trip-meta" style="margin-top:9px">${escapeHtml(alert.feedLabel)}</div>
      ${alert.url ? `<p><a href="${escapeHtml(alert.url)}" target="_blank" rel="noreferrer">More details ↗</a></p>` : ""}
    </article>`).join("");
}
function renderTrips(feeds) {
  const selected = el("line-filter").value;
  const trips = feeds.flatMap(feed => (feed.trips || []).map(trip => ({...trip, feedLabel: feed.feedLabel})))
    .filter(trip => selected === "all" || trip.route === selected)
    .sort((a,b) => a.route.localeCompare(b.route) ||
      (a.stops[0]?.arrivalTime || Infinity) - (b.stops[0]?.arrivalTime || Infinity));
  el("trip-count").textContent = trips.length;
  if (!trips.length) {
    el("trips").innerHTML = '<div class="empty">No upcoming trip updates found for this filter in the feeds that loaded. Try another line or refresh.</div>';
    return;
  }
  el("trips").innerHTML = trips.slice(0, 100).map(trip => {
    const stopChips = trip.stops.slice(0, 5).map(stop => `
      <span class="stop-chip">
        <strong>${escapeHtml(stop.stopId || "Unknown stop")}</strong>
        ${escapeHtml(formatTime(stop.arrivalIso))}
        ${stop.delaySeconds != null ? `<span> · ${stop.delaySeconds > 0 ? "+" : ""}${Math.round(stop.delaySeconds/60)} min delay</span>` : ""}
      </span>`).join("");
    return `<article class="trip-card">
      <div class="trip-top">${lineBadge(trip.route)}
        <div><div class="alert-title">Train ${escapeHtml(trip.route)}</div>
        <div class="trip-meta">${trip.directionId == null ? "Direction not provided" : `Direction ID ${trip.directionId}`} · ${escapeHtml(trip.feedLabel)}</div></div>
      </div>
      <div class="trip-stops">${stopChips || '<span class="trip-meta">No upcoming stop predictions in this update.</span>'}</div>
    </article>`;
  }).join("");
  if (trips.length > 100) {
    el("trips").insertAdjacentHTML("beforeend", `<div class="note">Showing 100 of ${trips.length} matching trip updates.</div>`);
  }
}
async function refresh() {
  if (loading) return;
  loading = true;
  el("refresh-button").disabled = true;
  el("refresh-button").textContent = "Refreshing…";
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
    latestData = await response.json();
    renderAlerts(latestData.feeds || []);
    renderTrips(latestData.feeds || []);
    const errors = latestData.errors || [];
    const dot = el("connection-dot");
    dot.className = `dot ${errors.length ? "bad" : "ok"}`;
    el("connection-status").textContent = errors.length
      ? `${errors.length} feed group(s) unavailable`
      : "Connected to MTA feeds";
    el("last-updated").textContent = `Fetched ${formatTime(latestData.updatedAt)}`;
    if (errors.length) {
      const note = document.createElement("div");
      note.className = "empty";
      note.textContent = "Some feed groups could not be loaded: " + errors.map(e => `${e.feed} (${e.error})`).join("; ");
      el("trips").prepend(note);
    }
  } catch (error) {
    el("connection-dot").className = "dot bad";
    el("connection-status").textContent = "Unable to load MTA data";
    el("alerts").innerHTML = `<div class="empty">${escapeHtml(error.message)}. Make sure the Node server is running and try again.</div>`;
    el("trips").innerHTML = '<div class="empty">Train updates are unavailable until the server can fetch the feeds.</div>';
  } finally {
    loading = false;
    el("refresh-button").disabled = false;
    el("refresh-button").textContent = "Refresh";
  }
}

el("refresh-button").addEventListener("click", refresh);
el("line-filter").addEventListener("change", () => {
  if (latestData) renderTrips(latestData.feeds || []);
});
refresh();
setInterval(refresh, 30_000);
