// --- Renderer Engine: GhostHound OSINT Frontend Controller ---

// Global states to cache scan outputs for active JSON exports
let activeSherlockData = null;
let activeDomainData = null;
let activeBreachData = null;
let activeExifData = null;

// Element references
const omnibox = document.getElementById("omnibox");
const btnScan = document.getElementById("btn-scan");
const logFeed = document.getElementById("log-feed");
const loadingOverlay = document.getElementById("loading-overlay");
const tabNavigation = document.getElementById("tab-navigation");
const tabPanes = document.querySelectorAll(".tab-pane");
const tabButtons = document.querySelectorAll(".tab-btn");
const currentUABadge = document.getElementById("ua-current-profile");

// Window title bar control buttons
const btnMinimize = document.getElementById("btn-minimize");
const btnMaximize = document.getElementById("btn-maximize");
const btnClose = document.getElementById("btn-close");

// Export buttons
const btnExportSherlock = document.getElementById("btn-export-sherlock");
const btnExportDomain = document.getElementById("btn-export-domain");
const btnExportBreaches = document.getElementById("btn-export-breaches");
const btnExportExif = document.getElementById("btn-export-exif");

// EXIF specific references
const exifDropZone = document.getElementById("exif-drop-zone");
const btnSelectFile = document.getElementById("btn-select-file");
const exifResultsArea = document.getElementById("exif-results-area");

/**
 * ----------------------------------------------------
 * INITIALIZATION & DRAG-AND-DROP BINDINGS
 * ----------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  addLog("GhostHound console initialized. Neural link established.", "sys");
  
  // Expose omnibox fill actions for welcome guide cards
  window.setOmniboxInput = (value) => {
    omnibox.value = value;
    omnibox.focus();
    addLog(`Omnibox target set to: ${value}`, "sys");
  };

  // Bind title bar window handlers
  if (btnMinimize) btnMinimize.addEventListener("click", () => window.ghostHoundAPI.minimize());
  if (btnMaximize) btnMaximize.addEventListener("click", () => window.ghostHoundAPI.maximize());
  if (btnClose) btnClose.addEventListener("click", () => window.ghostHoundAPI.close());

  // Click on the EXIF card in the dashboard switches tabs and focuses
  const exifCard = document.getElementById("guide-exif-click");
  if (exifCard) {
    exifCard.addEventListener("click", () => {
      switchTab("exif");
    });
  }

  // Bind primary scan actions
  btnScan.addEventListener("click", runOmniScan);
  omnibox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runOmniScan();
    }
  });

  // Bind export buttons
  btnExportSherlock.addEventListener("click", () => exportData(activeSherlockData, "sherlock_scan.json"));
  btnExportDomain.addEventListener("click", () => exportData(activeDomainData, "domain_scan.json"));
  btnExportBreaches.addEventListener("click", () => exportData(activeBreachData, "breach_scan.json"));
  btnExportExif.addEventListener("click", () => exportData(activeExifData, "exif_scan.json"));

  // EXIF Select File click
  btnSelectFile.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      const filePath = await window.ghostHoundAPI.selectFile();
      if (filePath) {
        runExifScan(filePath);
      }
    } catch (err) {
      addLog(`File dialog error: ${err.message}`, "error");
    }
  });

  // Setup EXIF drag and drop listeners
  exifDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    exifDropZone.classList.add("dragover");
  });

  exifDropZone.addEventListener("dragleave", () => {
    exifDropZone.classList.remove("dragover");
  });

  exifDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    exifDropZone.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Check if file path is available (provided by Electron)
      if (file.path) {
        runExifScan(file.path);
      } else {
        addLog("Drop error: Cannot retrieve absolute file path.", "error");
      }
    }
  });
});

/**
 * ----------------------------------------------------
 * TABS SWITCH SYSTEM
 * ----------------------------------------------------
 */

tabNavigation.addEventListener("click", (e) => {
  const tabName = e.target.getAttribute("data-tab");
  if (tabName) {
    switchTab(tabName);
  }
});

function switchTab(tabName) {
  // Update nav buttons
  tabButtons.forEach(btn => {
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update panes
  tabPanes.forEach(pane => {
    if (pane.id === `tab-pane-${tabName}`) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });
}

/**
 * ----------------------------------------------------
 * OPERATIONS LOG MANAGER
 * ----------------------------------------------------
 */

function addLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.innerText = `[${timestamp}] ${message}`;
  
  logFeed.appendChild(entry);
  logFeed.scrollTop = logFeed.scrollHeight; // Auto scroll to latest
}

/**
 * ----------------------------------------------------
 * CORE OMNIBOX SCAN PARSER
 * ----------------------------------------------------
 */

async function runOmniScan() {
  const query = omnibox.value.trim();
  if (!query) {
    addLog("Input error: Omnibox is empty.", "error");
    return;
  }

  // Parse input type
  if (query.startsWith("@")) {
    // Sherlock query
    switchTab("sherlock");
    await runSherlockScan(query);
  } else if (query.includes("@") && query.includes(".")) {
    // Email query
    switchTab("breaches");
    await runBreachScan(query);
  } else {
    // Domain or IP
    switchTab("domain");
    await runDomainScan(query);
  }
}

/**
 * ----------------------------------------------------
 * SHERLOCK MODULE FRONTERND RENDERER
 * ----------------------------------------------------
 */

async function runSherlockScan(username) {
  showLoader(true);
  addLog(`[OSINT] Starting Sherlock usernames check for target: ${username}`, "info");
  
  const statsDiv = document.getElementById("stats-sherlock");
  const tbody = document.querySelector("#table-sherlock tbody");
  
  statsDiv.innerText = "Scanning in progress... connection sockets rotating.";
  tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Running 15 concurrent platform socket checks...</td></tr>`;

  try {
    const results = await window.ghostHoundAPI.checkUsername(username);
    activeSherlockData = results;

    if (results.error) {
      throw new Error(results.error);
    }

    const foundCount = results.filter(r => r.found).length;
    addLog(`[OSINT] Sherlock completed. Profiles found: ${foundCount}/${results.length}`, "success");
    statsDiv.innerText = `Scan complete. Found: ${foundCount} / ${results.length} platforms checked.`;

    // Render results
    tbody.innerHTML = "";
    results.forEach(row => {
      const tr = document.createElement("tr");
      
      const tdPlatform = document.createElement("td");
      tdPlatform.innerHTML = `<strong>${row.platform}</strong>`;
      
      const tdUrl = document.createElement("td");
      if (row.found) {
        tdUrl.innerHTML = `<a href="${row.url}" target="_blank" style="color: var(--accent-cyan); text-decoration: underline;">${row.url}</a>`;
      } else {
        tdUrl.innerText = row.url;
        tdUrl.style.color = "var(--text-muted)";
      }

      const tdStatus = document.createElement("td");
      const statusClass = row.status === "FOUND" ? "found" : (row.status.startsWith("ERROR") ? "error" : "not-found");
      tdStatus.innerHTML = `<span class="badge-status ${statusClass}">${row.status}</span>`;

      tr.appendChild(tdPlatform);
      tr.appendChild(tdUrl);
      tr.appendChild(tdStatus);
      tbody.appendChild(tr);
    });

  } catch (err) {
    addLog(`Sherlock scan failed: ${err.message}`, "error");
    statsDiv.innerText = "Scan failed due to connection error.";
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state" style="color: var(--status-red);">ERROR: ${err.message}</td></tr>`;
  } finally {
    showLoader(false);
  }
}

/**
 * ----------------------------------------------------
 * DOMAIN / IP MODULE FRONTEND RENDERER
 * ----------------------------------------------------
 */

async function runDomainScan(target) {
  showLoader(true);
  addLog(`[OSINT] Launching active WHOIS/DNS/Shodan lookup for: ${target}`, "info");
  
  const statsDiv = document.getElementById("stats-domain");
  const resultsArea = document.getElementById("domain-results-area");
  
  statsDiv.innerText = "Querying WHOIS records, DNS servers, GeoIP mapping, and Shodan database...";
  resultsArea.innerHTML = `<div class="empty-state">Active OSINT sockets open... resolving target...</div>`;

  try {
    const data = await window.ghostHoundAPI.investigateDomain(target);
    activeDomainData = data;

    if (data.error) {
      throw new Error(data.error);
    }

    addLog(`[OSINT] Resolved ${target} successfully. Resolving IP: ${data.resolvedIP || "N/A"}`, "success");
    statsDiv.innerText = `Investigated: ${data.target} | Resolved IP: ${data.resolvedIP || "N/A"}`;

    // Render components
    let geoHtml = `<p class="exif-label">No GeoIP records found</p>`;
    if (data.geoip && !data.geoip.error) {
      const g = data.geoip;
      geoHtml = `
        <div class="exif-meta-list">
          <div class="exif-meta-item"><span class="exif-label">Query Target:</span><span class="exif-val">${g.query || "N/A"}</span></div>
          <div class="exif-meta-item"><span class="exif-label">Country:</span><span class="exif-val">${g.country || "N/A"} (${g.countryCode || "N/A"})</span></div>
          <div class="exif-meta-item"><span class="exif-label">Region/City:</span><span class="exif-val">${g.regionName || "N/A"}, ${g.city || "N/A"}</span></div>
          <div class="exif-meta-item"><span class="exif-label">Zip Code:</span><span class="exif-val">${g.zip || "N/A"}</span></div>
          <div class="exif-meta-item"><span class="exif-label">ISP:</span><span class="exif-val">${g.isp || "N/A"}</span></div>
          <div class="exif-meta-item"><span class="exif-label">Organization:</span><span class="exif-val">${g.org || "N/A"}</span></div>
          <div class="exif-meta-item"><span class="exif-label">AS/ASN:</span><span class="exif-val">${g.as || "N/A"}</span></div>
          <div class="exif-meta-item"><span class="exif-label">Coordinates:</span><span class="exif-val">${g.lat || "N/A"}, ${g.lon || "N/A"}</span></div>
        </div>
      `;
    } else if (data.geoip && data.geoip.error) {
      geoHtml = `<div class="empty-state" style="color: var(--status-red); padding: 20px !important;">${data.geoip.error}</div>`;
    }

    // DNS HTML Builder
    let dnsHtml = "";
    if (data.dns) {
      dnsHtml = `<div class="dns-list">`;
      for (const [recordType, records] of Object.entries(data.dns)) {
        dnsHtml += `
          <div class="dns-type-group">
            <div class="dns-type-title">${recordType} Records</div>
            ${records.map(r => `<div class="dns-record-val">${typeof r === "object" ? JSON.stringify(r) : r}</div>`).join("")}
          </div>
        `;
      }
      dnsHtml += `</div>`;
    } else {
      dnsHtml = `<div class="empty-state">No DNS lookups loaded.</div>`;
    }

    // Shodan HTML
    let shodanHtml = "";
    if (data.shodan && !data.shodan.error) {
      const s = data.shodan;
      const ports = Array.isArray(s.ports) ? s.ports : [];
      const vulns = Array.isArray(s.vulns) ? s.vulns : [];
      const tags = Array.isArray(s.tags) ? s.tags : [];
      const hostnames = Array.isArray(s.hostnames) ? s.hostnames : [];
      
      shodanHtml = `
        <div class="exif-meta-list">
          <div class="exif-meta-item" style="border-bottom:none;">
            <span class="exif-label">Open Ports Indexed:</span>
            <span class="exif-val">
              ${ports.length > 0 ? ports.map(p => `<span class="port-badge">${p}</span>`).join("") : "None detected"}
            </span>
          </div>
          <div class="exif-meta-item" style="border-bottom:none;">
            <span class="exif-label">Vulnerabilities:</span>
            <span class="exif-val">
              ${vulns.length > 0 ? vulns.map(v => `<span class="vuln-badge" title="Shodan Vulnerability">${v}</span>`).join("") : "None indexed"}
            </span>
          </div>
          <div class="exif-meta-item"><span class="exif-label">Hostnames:</span><span class="exif-val">${hostnames.join(", ") || "None"}</span></div>
          <div class="exif-meta-item"><span class="exif-label">System Tags:</span><span class="exif-val">${tags.join(", ") || "None"}</span></div>
        </div>
      `;
    } else if (data.shodan && data.shodan.error) {
      shodanHtml = `<div class="empty-state" style="color: var(--status-red); padding: 20px !important;">${data.shodan.error}</div>`;
    } else {
      shodanHtml = `<div class="empty-state">No Shodan database indices.</div>`;
    }

    // WHOIS text format
    let whoisText = "No WHOIS records resolved.";
    if (data.whois) {
      if (data.whois.error) {
        whoisText = data.whois.error;
      } else {
        whoisText = Object.entries(data.whois)
          .map(([key, val]) => `${key.toUpperCase().padEnd(25)}: ${val}`)
          .join("\n");
      }
    }

    // Reverse IP format
    let reverseIpHtml = "No Reverse IP records detected.";
    if (Array.isArray(data.reverseIp)) {
      reverseIpHtml = data.reverseIp.join("\n");
    } else if (data.reverseIp && data.reverseIp.error) {
      reverseIpHtml = data.reverseIp.error;
    }

    resultsArea.innerHTML = `
      <div class="domain-results-grid">
        <div class="domain-section">
          <h3>GEOLOCATION INFO (ip-api)</h3>
          ${geoHtml}
        </div>
        <div class="domain-section">
          <h3>DNS RESOLVER CHANNELS</h3>
          ${dnsHtml}
        </div>
        <div class="domain-section">
          <h3>SHODAN FREE INTERNETDB PORTS</h3>
          ${shodanHtml}
        </div>
        <div class="domain-section">
          <h3>REVERSE IP LOOKUPS (hackertarget)</h3>
          <div class="shodan-block terminal-scroll">${reverseIpHtml}</div>
        </div>
      </div>
      <div class="domain-section" style="margin-top: 20px;">
        <h3>WHOIS DOMAIN RECORDS</h3>
        <div class="whois-block terminal-scroll">${whoisText}</div>
      </div>
    `;

  } catch (err) {
    addLog(`Domain scan failed: ${err.message}`, "error");
    statsDiv.innerText = "Scan failed.";
    resultsArea.innerHTML = `<div class="empty-state" style="color: var(--status-red);">ERROR: ${err.message}</div>`;
  } finally {
    showLoader(false);
  }
}

/**
 * ----------------------------------------------------
 * email BREACH SCANNER MODULE FRONTERND RENDERER
 * ----------------------------------------------------
 */

async function runBreachScan(email) {
  showLoader(true);
  addLog(`[OSINT] Querying public databases for compromised email: ${email}`, "info");

  const statsDiv = document.getElementById("stats-breaches");
  const tbody = document.querySelector("#table-breaches tbody");

  statsDiv.innerText = "Searching databases (LeakCheck, XposedOrNot)...";
  tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Connecting to public APIs... holding sockets...</td></tr>`;

  try {
    const results = await window.ghostHoundAPI.searchBreach(email);
    activeBreachData = results;

    addLog(`[OSINT] Breach search complete. Total records resolved: ${results.length}`, "success");
    statsDiv.innerText = `Scan complete. Discovered compromised records: ${results.length} breaches found.`;

    if (results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color: var(--status-green);">Excellent: No compromised entries detected for this email target!</td></tr>`;
    } else {
      tbody.innerHTML = "";
      results.forEach(row => {
        const tr = document.createElement("tr");

        const tdSource = document.createElement("td");
        tdSource.innerHTML = `<strong>${row.source}</strong>`;

        const tdName = document.createElement("td");
        tdName.innerHTML = `<span class="badge-status breach">${row.breachName}</span>`;

        const tdDate = document.createElement("td");
        tdDate.innerText = row.date;

        const tdDataTypes = document.createElement("td");
        tdDataTypes.innerHTML = row.dataTypes.map(t => `<span class="port-badge" style="background-color: rgba(255,255,255,0.05); color: var(--text-main); border-color: var(--border-color);">${t}</span>`).join(" ");

        tr.appendChild(tdSource);
        tr.appendChild(tdName);
        tr.appendChild(tdDate);
        tr.appendChild(tdDataTypes);
        tbody.appendChild(tr);
      });
    }

  } catch (err) {
    addLog(`Breach lookup failed: ${err.message}`, "error");
    statsDiv.innerText = "Scan failed.";
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color: var(--status-red);">ERROR: ${err.message}</td></tr>`;
  } finally {
    showLoader(false);
  }
}

/**
 * ----------------------------------------------------
 * EXIF MODULE FRONTEND RENDERER & DRAG/DROP
 * ----------------------------------------------------
 */

async function runExifScan(filePath) {
  showLoader(true);
  addLog(`[OSINT] Processing image EXIF target: ${filePath}`, "info");

  try {
    const data = await window.ghostHoundAPI.extractEXIF(filePath);
    activeExifData = data;

    if (data.error) {
      throw new Error(data.error);
    }

    addLog(`[OSINT] EXIF headers read successfully from: ${data.fileName}`, "success");

    // Build values display
    const metaListHtml = `
      <div class="exif-meta-item"><span class="exif-label">Filename:</span><span class="exif-val">${data.fileName}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Date Taken:</span><span class="exif-val">${data.dateTaken}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Camera Model:</span><span class="exif-val">${data.cameraModel}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Manufacturer:</span><span class="exif-val">${data.cameraMake}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Software:</span><span class="exif-val">${data.software}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Image Resolution:</span><span class="exif-val">${data.dimensions}</span></div>
    `;

    // Check GPS
    let mapCardHtml = `
      <div class="gps-embed-placeholder">
        <span class="gps-icon" style="color: var(--text-muted); animation: none;">📍</span>
        <h4>NO EXIF GPS DATA DETECTED</h4>
        <p>This image does not contain embedded geolocation headers.</p>
      </div>
    `;

    if (data.gps) {
      mapCardHtml = `
        <div class="gps-embed-placeholder" style="border-color: rgba(255, 68, 68, 0.3); background-color: rgba(255, 68, 68, 0.01);">
          <span class="gps-icon">📍</span>
          <h4 style="color: var(--status-red); font-family: var(--title-font);">GPS GEOLOCATION RESOLVED</h4>
          <p>Coordinates: ${data.gps.latitude.toFixed(6)}, ${data.gps.longitude.toFixed(6)}</p>
          <button class="btn-gps" onclick="window.open('${data.gps.googleMapsLink}', '_blank')">OPEN GOOGLE MAPS</button>
        </div>
      `;
    }

    exifResultsArea.innerHTML = `
      <div class="exif-results-container" style="margin-top: 20px;">
        <div class="exif-card">
          <h3>IMAGE HEADER DATA</h3>
          <div class="exif-meta-list">${metaListHtml}</div>
        </div>
        <div class="exif-card map-card">
          <h3>GPS GEO-LOCK TARGET</h3>
          ${mapCardHtml}
        </div>
      </div>
    `;
    
    exifResultsArea.style.display = "block";
    exifDropZone.style.display = "none"; // Hide dropzone

  } catch (err) {
    addLog(`EXIF parser error: ${err.message}`, "error");
    exifResultsArea.innerHTML = `
      <div class="exif-card" style="grid-column: 1 / -1; border-color: var(--status-red);">
        <h3 style="color: var(--status-red);">EXTRACTION ERROR</h3>
        <p>${err.message}</p>
        <button class="btn-primary" style="margin-top: 15px;" onclick="resetExifView()">TRY ANOTHER FILE</button>
      </div>
    `;
    exifResultsArea.style.display = "block";
    exifDropZone.style.display = "none";
  } finally {
    showLoader(false);
  }
}

// Reset dropzone to allow another file
window.resetExifView = () => {
  exifResultsArea.style.display = "none";
  exifDropZone.style.display = "block";
  activeExifData = null;
  addLog("EXIF workbench reset.", "sys");
};

// Setup dropzone click to open select file dialog as fallback
exifDropZone.addEventListener("click", async () => {
  try {
    const filePath = await window.ghostHoundAPI.selectFile();
    if (filePath) {
      runExifScan(filePath);
    }
  } catch (err) {
    addLog(`File dialog error: ${err.message}`, "error");
  }
});

/**
 * ----------------------------------------------------
 * SECURE EXPORTER HANDLERS
 * ----------------------------------------------------
 */

async function exportData(data, filename) {
  if (!data) {
    addLog("Export error: No active scan data to write.", "error");
    return;
  }

  addLog(`[SYSTEM] Attempting export to disk: ${filename}...`, "info");
  try {
    const result = await window.ghostHoundAPI.exportJSON(data, filename);
    if (result && result.success) {
      addLog(`[SYSTEM] Export succeeded! Saved to: ${result.filePath}`, "success");
    } else if (result && result.error) {
      if (result.error.includes("canceled")) {
        addLog("[SYSTEM] Export action aborted by user.", "sys");
      } else {
        addLog(`[SYSTEM] Export failed: ${result.error}`, "error");
      }
    }
  } catch (err) {
    addLog(`[SYSTEM] Exporter exception: ${err.message}`, "error");
  }
}

/**
 * ----------------------------------------------------
 * UI CONTROLLER SPIN LOADER
 * ----------------------------------------------------
 */

function showLoader(visible) {
  if (visible) {
    loadingOverlay.classList.add("visible");
  } else {
    loadingOverlay.classList.remove("visible");
  }
}
