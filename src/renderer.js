// ==========================================================================
// RENDERER CORE: GhostHound Enterprise Frontend state & UI controller
// Calm, dense, технічний and highly interactive SaaS investigation environment.
// ==========================================================================

// Global state container
const state = {
  activeTarget: "",
  activeTargetType: "", // 'username', 'domain_ip', 'email'
  recentSearches: [],
  savedTargets: [],
  sidebarWidth: 250,
  isSidebarCollapsed: false,
  isConsoleCollapsed: true,
  activeSherlockFilter: "all", // 'all' or 'found'
  
  // Scans cache
  sherlockData: null,
  domainData: null,
  breachData: null,
  exifData: null
};

// Element references
const omnibox = document.getElementById("omnibox");
const btnScan = document.getElementById("btn-scan");
const logFeed = document.getElementById("log-feed");
const loadingOverlay = document.getElementById("loading-overlay");
const tabNavigation = document.getElementById("tab-navigation");
const tabPanes = document.querySelectorAll(".tab-pane");
const tabButtons = document.querySelectorAll(".tab-btn");
const currentUABadge = document.getElementById("ua-current-profile");

const sidebar = document.getElementById("sidebar");
const sidebarResizer = document.getElementById("sidebar-resizer");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
const historyList = document.getElementById("history-list");
const savedList = document.getElementById("saved-list");

const scanProgressContainer = document.getElementById("scan-progress-container");
const scanProgressText = document.getElementById("scan-progress-text");

const bottomConsole = document.getElementById("bottom-console");
const btnToggleConsole = document.getElementById("btn-toggle-console");

// Export actions
const btnExportSherlock = document.getElementById("btn-export-sherlock");
const btnExportDomain = document.getElementById("btn-export-domain");
const btnExportBreaches = document.getElementById("btn-export-breaches");
const btnExportExif = document.getElementById("btn-export-exif");

// Bookmark actions
const btnSaveSherlock = document.getElementById("btn-save-sherlock");
const btnSaveDomain = document.getElementById("btn-save-domain");
const btnSaveBreaches = document.getElementById("btn-save-breaches");

// EXIF References
const exifDropZone = document.getElementById("exif-drop-zone");
const btnSelectFile = document.getElementById("btn-select-file");
const exifResultsArea = document.getElementById("exif-results-area");

// Window title bar control buttons
const btnMinimize = document.getElementById("btn-minimize");
const btnMaximize = document.getElementById("btn-maximize");
const btnClose = document.getElementById("btn-close");

// Sherlock filters
const sherlockFilterBar = document.getElementById("sherlock-filter-bar");
const btnFilterAll = document.getElementById("btn-filter-all");
const btnFilterFound = document.getElementById("btn-filter-found");

/**
 * ----------------------------------------------------
 * INITIALIZATION & STATE PERSISTENCE
 * ----------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  // Load state from local storage
  loadSavedState();

  addLog("GhostHound Workstation initialized. Passive OSINT engine online.", "sys");
  
  // Set initial sidebar width
  sidebar.style.width = `${state.sidebarWidth}px`;

  // Bind fill omnibox helper globally
  window.setOmniboxInput = (value) => {
    omnibox.value = value;
    omnibox.focus();
    addLog(`Omnibox target set to: ${value}`, "sys");
  };

  // Click on the EXIF card in dashboard switches tabs
  const exifCard = document.getElementById("guide-exif-click");
  if (exifCard) {
    exifCard.addEventListener("click", () => {
      switchTab("exif");
    });
  }

  // Window title bar window handlers
  if (btnMinimize) btnMinimize.addEventListener("click", () => window.ghostHoundAPI.minimize());
  if (btnMaximize) btnMaximize.addEventListener("click", () => window.ghostHoundAPI.maximize());
  if (btnClose) btnClose.addEventListener("click", () => window.ghostHoundAPI.close());

  // Bind core scan actions
  btnScan.addEventListener("click", runOmniScan);
  omnibox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runOmniScan();
    }
  });

  // Sidebar drag resizer bindings
  sidebarResizer.addEventListener("mousedown", initSidebarResize);

  // Sidebar collapse toggle
  btnToggleSidebar.addEventListener("click", toggleSidebar);

  // Bottom console expand toggle
  btnToggleConsole.addEventListener("click", toggleConsole);
  document.querySelector(".console-header").addEventListener("click", (e) => {
    // Prevent double trigger if clicking toggle button directly
    if (e.target.id !== "btn-toggle-console") {
      toggleConsole();
    }
  });

  // Export buttons
  btnExportSherlock.addEventListener("click", () => exportData(state.sherlockData, "sherlock_scan.json"));
  btnExportDomain.addEventListener("click", () => exportData(state.domainData, "domain_scan.json"));
  btnExportBreaches.addEventListener("click", () => exportData(state.breachData, "breach_scan.json"));
  btnExportExif.addEventListener("click", () => exportData(state.exifData, "exif_scan.json"));

  // Bookmarking / Saved targets triggers
  btnSaveSherlock.addEventListener("click", toggleActiveBookmark);
  btnSaveDomain.addEventListener("click", toggleActiveBookmark);
  btnSaveBreaches.addEventListener("click", toggleActiveBookmark);

  // Sherlock filters
  btnFilterAll.addEventListener("click", () => setSherlockFilter("all"));
  btnFilterFound.addEventListener("click", () => setSherlockFilter("found"));

  // EXIF Select File trigger
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
      if (file.path) {
        runExifScan(file.path);
      } else {
        addLog("Drop error: Cannot retrieve absolute file path.", "error");
      }
    }
  });

  // Expose global pivot pivoting function
  window.pivotSearch = (value) => {
    addLog(`Pivoting target focus to: ${value}`, "info");
    omnibox.value = value;
    omnibox.focus();
    runOmniScan();
  };
});

// Load recent searches & saved cases from local storage
function loadSavedState() {
  try {
    const cachedHistory = localStorage.getItem("gh_history");
    if (cachedHistory) {
      state.recentSearches = JSON.parse(cachedHistory);
    }
    
    const cachedSaved = localStorage.getItem("gh_saved");
    if (cachedSaved) {
      state.savedTargets = JSON.parse(cachedSaved);
    }

    const cachedWidth = localStorage.getItem("gh_sidebar_width");
    if (cachedWidth) {
      state.sidebarWidth = parseInt(cachedWidth, 10);
    }

    renderHistoryList();
    renderSavedList();
  } catch (err) {
    console.error("Failed to load local storage state:", err);
  }
}

/**
 * ----------------------------------------------------
 * INTERACTIVE SIDEBAR RESIZER & COLLAPSE LOGIC
 * ----------------------------------------------------
 */

function initSidebarResize(e) {
  e.preventDefault();
  state.isResizing = true;
  sidebarResizer.classList.add("dragging");
  document.addEventListener("mousemove", handleSidebarResize);
  document.addEventListener("mouseup", stopSidebarResize);
}

function handleSidebarResize(e) {
  if (!state.isResizing) return;
  // Dragging boundary limits
  let newWidth = e.clientX;
  if (newWidth < 160) newWidth = 160;
  if (newWidth > 450) newWidth = 450;

  state.sidebarWidth = newWidth;
  sidebar.style.width = `${newWidth}px`;
}

function stopSidebarResize() {
  state.isResizing = false;
  sidebarResizer.classList.remove("dragging");
  document.removeEventListener("mousemove", handleSidebarResize);
  document.removeEventListener("mouseup", stopSidebarResize);
  localStorage.setItem("gh_sidebar_width", state.sidebarWidth);
}

function toggleSidebar() {
  state.isSidebarCollapsed = !state.isSidebarCollapsed;
  if (state.isSidebarCollapsed) {
    sidebar.classList.add("collapsed");
    btnToggleSidebar.innerText = "▶";
    btnToggleSidebar.title = "Expand Sidebar";
  } else {
    sidebar.classList.remove("collapsed");
    sidebar.style.width = `${state.sidebarWidth}px`;
    btnToggleSidebar.innerText = "◀";
    btnToggleSidebar.title = "Collapse Sidebar";
  }
}

/**
 * ----------------------------------------------------
 * COLLAPSIBLE BOTTOM TERMINAL DRAWER (VSCODE STYLE)
 * ----------------------------------------------------
 */

function toggleConsole() {
  state.isConsoleCollapsed = !state.isConsoleCollapsed;
  if (state.isConsoleCollapsed) {
    bottomConsole.classList.remove("expanded");
    bottomConsole.classList.add("collapsed");
    btnToggleConsole.innerText = "▲ Expand Console";
  } else {
    bottomConsole.classList.remove("collapsed");
    bottomConsole.classList.add("expanded");
    btnToggleConsole.innerText = "▼ Collapse Console";
    
    // Auto scroll to latest logs on expand
    setTimeout(() => {
      logFeed.scrollTop = logFeed.scrollHeight;
    }, 150);
  }
}

/**
 * ----------------------------------------------------
 * SYSTEM OPERATIONAL LOG MANAGER
 * ----------------------------------------------------
 */

function addLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.innerText = `[${timestamp}] ${message}`;
  
  logFeed.appendChild(entry);
  logFeed.scrollTop = logFeed.scrollHeight; // Keep scrolled
}

/**
 * ----------------------------------------------------
 * DYNAMIC LOCALSTORAGE MANAGEMENT (HISTORY & SAVED)
 * ----------------------------------------------------
 */

function addRecentSearch(query, type) {
  // Prevent duplicate additions in immediate history
  state.recentSearches = state.recentSearches.filter(item => item.query !== query);
  
  state.recentSearches.unshift({ query, type, timestamp: Date.now() });
  
  // Cap at 12 recent searches
  if (state.recentSearches.length > 12) {
    state.recentSearches.pop();
  }
  
  localStorage.setItem("gh_history", JSON.stringify(state.recentSearches));
  renderHistoryList();
}

function renderHistoryList() {
  historyList.innerHTML = "";
  if (state.recentSearches.length === 0) {
    historyList.innerHTML = `<li class="empty-list-msg">No recent history</li>`;
    return;
  }

  state.recentSearches.forEach(item => {
    const li = document.createElement("li");
    li.title = `Search target: ${item.query}`;
    
    let typeIcon = "🕵️";
    if (item.type === "email") typeIcon = "✉️";
    if (item.type === "domain_ip") typeIcon = "🌐";
    if (item.type === "username") typeIcon = "👤";

    li.innerHTML = `<span class="list-icon">${typeIcon}</span> ${item.query}`;
    li.addEventListener("click", () => {
      omnibox.value = item.query;
      runOmniScan();
    });
    historyList.appendChild(li);
  });
}

function toggleActiveBookmark() {
  const currentTarget = state.activeTarget;
  const currentType = state.activeTargetType;
  if (!currentTarget) return;

  const exists = state.savedTargets.find(t => t.query === currentTarget);
  
  if (exists) {
    // Unbookmark
    state.savedTargets = state.savedTargets.filter(t => t.query !== currentTarget);
    addLog(`Target removed from Saved list: ${currentTarget}`, "sys");
  } else {
    // Bookmark
    state.savedTargets.unshift({ query: currentTarget, type: currentType, timestamp: Date.now() });
    addLog(`Target bookmarked in Saved Targets: ${currentTarget}`, "success");
  }

  localStorage.setItem("gh_saved", JSON.stringify(state.savedTargets));
  renderSavedList();
  updateBookmarkButtonsState();
}

function renderSavedList() {
  savedList.innerHTML = "";
  if (state.savedTargets.length === 0) {
    savedList.innerHTML = `<li class="empty-list-msg">No saved targets</li>`;
    return;
  }

  state.savedTargets.forEach(item => {
    const li = document.createElement("li");
    li.title = `Saved target: ${item.query}`;
    
    let typeIcon = "⭐";
    if (item.type === "email") typeIcon = "✉️";
    if (item.type === "domain_ip") typeIcon = "🌐";
    if (item.type === "username") typeIcon = "👤";

    li.innerHTML = `<span class="list-icon" style="color: var(--status-amber);">${typeIcon}</span> ${item.query}`;
    li.addEventListener("click", () => {
      omnibox.value = item.query;
      runOmniScan();
    });
    savedList.appendChild(li);
  });
}

function updateBookmarkButtonsState() {
  const currentTarget = state.activeTarget;
  const isSaved = state.savedTargets.some(t => t.query === currentTarget);

  const starText = isSaved ? "★ Saved Target" : "★ Save Target";
  
  if (btnSaveSherlock) btnSaveSherlock.innerText = starText;
  if (btnSaveDomain) btnSaveDomain.innerText = starText;
  if (btnSaveBreaches) btnSaveBreaches.innerText = starText;
}

/**
 * ----------------------------------------------------
 * TABS CONTROLLER
 * ----------------------------------------------------
 */

tabNavigation.addEventListener("click", (e) => {
  const tabName = e.target.getAttribute("data-tab");
  if (tabName) {
    switchTab(tabName);
  }
});

function switchTab(tabName) {
  tabButtons.forEach(btn => {
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

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
 * CORE OMNIBOX SCAN PARSER
 * ----------------------------------------------------
 */

async function runOmniScan() {
  const query = omnibox.value.trim();
  if (!query) {
    addLog("Input error: omnibox target is empty.", "error");
    return;
  }

  state.activeTarget = query;

  // Determine query target type and execute
  if (query.startsWith("@")) {
    state.activeTargetType = "username";
    addRecentSearch(query, "username");
    switchTab("sherlock");
    await runSherlockScan(query);
  } else if (query.includes("@") && query.includes(".")) {
    state.activeTargetType = "email";
    addRecentSearch(query, "email");
    switchTab("breaches");
    await runBreachScan(query);
  } else {
    state.activeTargetType = "domain_ip";
    addRecentSearch(query, "domain_ip");
    switchTab("domain");
    await runDomainScan(query);
  }

  updateBookmarkButtonsState();
}

/**
 * ----------------------------------------------------
 * ADVANCED STATUS UPDATING SEQUENCER
 * ----------------------------------------------------
 */

function updateSearchStage(text, isVisible = true) {
  if (isVisible) {
    scanProgressContainer.classList.remove("progress-hidden");
    scanProgressText.innerText = text;
    addLog(`[OSINT Stage] ${text}`, "sys");
  } else {
    scanProgressContainer.classList.add("progress-hidden");
  }
}

/**
 * ----------------------------------------------------
 * SHERLOCK MODULE FRONTEND RENDERER
 * ----------------------------------------------------
 */

async function runSherlockScan(username) {
  showLoader(true);
  updateSearchStage("Rotating active stealth sockets...");
  
  const statsDiv = document.getElementById("stats-sherlock");
  const tbody = document.querySelector("#table-sherlock tbody");
  
  statsDiv.innerText = "Sherlock scanner starting up...";
  tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Resolving platfrom target directories...</td></tr>`;

  // Realistic stage progression
  const stageTimeout = setTimeout(() => {
    updateSearchStage("Correlating profile endpoints...");
  }, 1800);

  try {
    const results = await window.ghostHoundAPI.checkUsername(username);
    clearTimeout(stageTimeout);
    
    state.sherlockData = results;

    if (results.error) {
      throw new Error(results.error);
    }

    const foundCount = results.filter(r => r.found).length;
    addLog(`[OSINT] Sherlock completed username check. Found ${foundCount} profiles.`, "success");
    statsDiv.innerText = `Found: ${foundCount} / ${results.length} channels checked.`;

    // Unhide filter options
    sherlockFilterBar.style.display = "flex";
    setSherlockFilter("all"); // Reset to show all

  } catch (err) {
    clearTimeout(stageTimeout);
    addLog(`Sherlock scan failed: ${err.message}`, "error");
    statsDiv.innerText = "Scan failed.";
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state" style="color: var(--status-red);">ERROR: ${err.message}</td></tr>`;
    sherlockFilterBar.style.display = "none";
  } finally {
    updateSearchStage("", false);
    showLoader(false);
  }
}

function setSherlockFilter(filterType) {
  state.activeSherlockFilter = filterType;

  // Update button active UI
  if (filterType === "all") {
    btnFilterAll.classList.add("active");
    btnFilterFound.classList.remove("active");
  } else {
    btnFilterAll.classList.remove("active");
    btnFilterFound.classList.add("active");
  }

  renderSherlockTable();
}

function renderSherlockTable() {
  const tbody = document.querySelector("#table-sherlock tbody");
  const data = state.sherlockData;
  if (!data) return;

  tbody.innerHTML = "";
  
  const filtered = state.activeSherlockFilter === "found" 
    ? data.filter(r => r.found) 
    : data;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No matching profiles to show.</td></tr>`;
    return;
  }

  filtered.forEach(row => {
    const tr = document.createElement("tr");
    
    const tdPlatform = document.createElement("td");
    tdPlatform.innerHTML = `<strong>${row.platform}</strong>`;
    
    const tdUrl = document.createElement("td");
    if (row.found) {
      // Pivot enable username click if available, or just render link
      const targetUser = row.url.split("/").pop();
      tdUrl.innerHTML = `<a href="${row.url}" target="_blank" class="pivot-link">${row.url}</a>`;
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
}

/**
 * ----------------------------------------------------
 * DOMAIN / IP MODULE FRONTEND RENDERER & PIVOTS
 * ----------------------------------------------------
 */

async function runDomainScan(target) {
  showLoader(true);
  updateSearchStage("Resolving DNS records...");
  
  const statsDiv = document.getElementById("stats-domain");
  const resultsArea = document.getElementById("domain-results-area");
  
  statsDiv.innerText = "Resolving target configurations...";
  resultsArea.innerHTML = `<div class="empty-state">Active DNS sockets scanning... resolving IP zones...</div>`;

  const stage1 = setTimeout(() => {
    updateSearchStage("Querying WHOIS registries...");
  }, 1200);

  const stage2 = setTimeout(() => {
    updateSearchStage("Polling Shodan index infrastructure...");
  }, 2500);

  try {
    const data = await window.ghostHoundAPI.investigateDomain(target);
    clearTimeout(stage1);
    clearTimeout(stage2);
    
    state.domainData = data;

    if (data.error) {
      throw new Error(data.error);
    }

    const resIP = data.resolvedIP || "N/A";
    addLog(`[OSINT] Resolved domain IP endpoint successfully: ${resIP}`, "success");
    statsDiv.innerText = `Target: ${data.target} | Address: ${resIP}`;

    // 1. Calculate Risk Score based on exposed parameters
    let riskScore = 10; // Base score
    let riskLevel = "low";
    
    if (data.shodan && !data.shodan.error) {
      const ports = Array.isArray(data.shodan.ports) ? data.shodan.ports.length : 0;
      const vulns = Array.isArray(data.shodan.vulns) ? data.shodan.vulns.length : 0;
      
      riskScore += (ports * 15);
      riskScore += (vulns * 20);
    }
    
    if (riskScore > 100) riskScore = 100;
    
    if (riskScore >= 70) {
      riskLevel = "high";
    } else if (riskScore >= 35) {
      riskLevel = "medium";
    }

    // 2. Render Geolocation Info Panel
    let geoHtml = `<p class="overview-label">No GeoIP records mapped</p>`;
    if (data.geoip && !data.geoip.error) {
      const g = data.geoip;
      geoHtml = `
        <div class="overview-data-list">
          <div class="overview-data-row"><span class="overview-label">Query Endpoint:</span><span class="overview-value pivot-link" onclick="pivotSearch('${g.query}')">${g.query || "N/A"}</span></div>
          <div class="overview-data-row"><span class="overview-label">Country Geo:</span><span class="overview-value">${g.country || "N/A"} (${g.countryCode || "N/A"})</span></div>
          <div class="overview-data-row"><span class="overview-label">ISP Provider:</span><span class="overview-value">${g.isp || "N/A"}</span></div>
          <div class="overview-data-row"><span class="overview-label">Organization:</span><span class="overview-value">${g.org || "N/A"}</span></div>
          <div class="overview-data-row"><span class="overview-label">ASN Channel:</span><span class="overview-value">${g.as || "N/A"}</span></div>
          <div class="overview-data-row"><span class="overview-label">Coordinates:</span><span class="overview-value">${g.lat || "N/A"}, ${g.lon || "N/A"}</span></div>
        </div>
      `;
    } else if (data.geoip && data.geoip.error) {
      geoHtml = `<div class="empty-state" style="color: var(--status-red); padding: 10px !important;">${data.geoip.error}</div>`;
    }

    // 3. DNS HTML list with pivoting links
    let dnsHtml = "";
    if (data.dns) {
      dnsHtml = `<div class="dns-list">`;
      for (const [recordType, records] of Object.entries(data.dns)) {
        dnsHtml += `
          <div class="dns-type-group">
            <div class="dns-type-title">${recordType} Records</div>
            ${records.map(r => {
              let val = typeof r === "object" ? JSON.stringify(r) : r;
              // Extract domain/IP from TXT/MX if applicable, else pivot enable values
              let isClickable = val && !val.includes("failed") && !val.includes("None");
              if (isClickable && recordType === "A") {
                return `<div class="dns-record-val pivot-link" onclick="pivotSearch('${val}')">${val}</div>`;
              }
              return `<div class="dns-record-val">${val}</div>`;
            }).join("")}
          </div>
        `;
      }
      dnsHtml += `</div>`;
    } else {
      dnsHtml = `<div class="empty-state">No DNS lookups loaded.</div>`;
    }

    // 4. Shodan Ports & vulnerabilities
    let shodanHtml = "";
    if (data.shodan && !data.shodan.error) {
      const s = data.shodan;
      const ports = Array.isArray(s.ports) ? s.ports : [];
      const vulns = Array.isArray(s.vulns) ? s.vulns : [];
      const tags = Array.isArray(s.tags) ? s.tags : [];
      const hostnames = Array.isArray(s.hostnames) ? s.hostnames : [];
      
      shodanHtml = `
        <div class="overview-data-list">
          <div class="overview-data-row" style="border-bottom:none;">
            <span class="overview-label">Open Ports:</span>
            <span class="overview-value">
              ${ports.length > 0 ? ports.map(p => `<span class="port-badge">${p}</span>`).join("") : "No open ports indexed"}
            </span>
          </div>
          <div class="overview-data-row" style="border-bottom:none;">
            <span class="overview-label">Exposed Vulnerabilities:</span>
            <span class="overview-value">
              ${vulns.length > 0 ? vulns.map(v => `<span class="vuln-badge" title="Shodan CVE ID">${v}</span>`).join("") : "None detected"}
            </span>
          </div>
          <div class="overview-data-row">
            <span class="overview-label">Hostnames:</span>
            <span class="overview-value">
              ${hostnames.length > 0 ? hostnames.map(h => `<span class="pivot-link" onclick="pivotSearch('${h}')">${h}</span>`).join(", ") : "None"}
            </span>
          </div>
          <div class="overview-data-row"><span class="overview-label">OS System Tags:</span><span class="overview-value">${tags.join(", ") || "None"}</span></div>
        </div>
      `;
    } else if (data.shodan && data.shodan.error) {
      shodanHtml = `<div class="empty-state" style="color: var(--status-red); padding: 10px !important;">${data.shodan.error}</div>`;
    } else {
      shodanHtml = `<div class="empty-state">No Shodan database indicators.</div>`;
    }

    // 5. WHOIS detail lines
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

    // 6. Reverse IP domain pivoting list
    let reverseIpHtml = "No Reverse IP hosts matched.";
    if (Array.isArray(data.reverseIp)) {
      reverseIpHtml = data.reverseIp.map(domain => {
        return `<div class="pivot-link" style="padding: 2px 0;" onclick="pivotSearch('${domain}')">${domain}</div>`;
      }).join("");
    } else if (data.reverseIp && data.reverseIp.error) {
      reverseIpHtml = `<span style="color: var(--status-red);">${data.reverseIp.error}</span>`;
    }

    // Render workspace dashboard grid
    resultsArea.innerHTML = `
      <div class="domain-results-grid">
        <!-- Target Overview and scoring circle -->
        <div class="domain-section">
          <h3>Target Overview</h3>
          <div class="overview-panel-content">
            <div class="overview-data-list">
              <div class="overview-data-row"><span class="overview-label">Query Endpoint:</span><span class="overview-value">${data.target}</span></div>
              <div class="overview-data-row"><span class="overview-label">IP Address:</span><span class="overview-value pivot-link" onclick="pivotSearch('${resIP}')">${resIP}</span></div>
              <div class="overview-data-row"><span class="overview-label">Geo Location:</span><span class="overview-value">${data.geoip && data.geoip.country ? data.geoip.country : "N/A"}</span></div>
            </div>
            <div class="risk-score-meter">
              <span class="risk-circle-value ${riskScore >= 70 ? 'risk-danger' : (riskScore >= 35 ? 'risk-warning' : '')}">${riskScore}/100</span>
              <span class="risk-label-text">Threat Score</span>
              <span class="risk-sublabel-level risk-level-${riskLevel}">${riskLevel} risk</span>
            </div>
          </div>
        </div>

        <div class="domain-section">
          <h3>Geolocation Details</h3>
          ${geoHtml}
        </div>

        <div class="domain-section">
          <h3>DNS Resolvers</h3>
          ${dnsHtml}
        </div>

        <div class="domain-section">
          <h3>Shodan Port Exposure</h3>
          ${shodanHtml}
        </div>

        <div class="domain-section section-full-width">
          <h3>Reverse IP Host Mapping</h3>
          <div class="shodan-block terminal-scroll" style="max-height: 180px;">${reverseIpHtml}</div>
        </div>

        <div class="domain-section section-full-width">
          <h3>WHOIS Domain Registrations</h3>
          <div class="whois-block terminal-scroll" style="max-height: 220px;">${whoisText}</div>
        </div>
      </div>
    `;

  } catch (err) {
    clearTimeout(stage1);
    clearTimeout(stage2);
    addLog(`Domain investigation failed: ${err.message}`, "error");
    statsDiv.innerText = "Scan failed.";
    resultsArea.innerHTML = `<div class="empty-state" style="color: var(--status-red);">ERROR: ${err.message}</div>`;
  } finally {
    updateSearchStage("", false);
    showLoader(false);
  }
}

/**
 * ----------------------------------------------------
 * EMAIL BREACH SCANNER MODULE FRONTEND RENDERER
 * ----------------------------------------------------
 */

async function runBreachScan(email) {
  showLoader(true);
  updateSearchStage("Connecting public threat databases...");
  
  const statsDiv = document.getElementById("stats-breaches");
  const tbody = document.querySelector("#table-breaches tbody");
  
  statsDiv.innerText = "Breach database connection active...";
  tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Polling breach record sets...</td></tr>`;

  const stage = setTimeout(() => {
    updateSearchStage("Scanning breach archives...");
  }, 1500);

  try {
    const results = await window.ghostHoundAPI.searchBreach(email);
    clearTimeout(stage);
    
    state.breachData = results;

    addLog(`[OSINT] Breach search completed. Total logs mapped: ${results.length}`, "success");
    statsDiv.innerText = `Discovered compromises: ${results.length} public breaches mapped.`;

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
        tdDataTypes.innerHTML = row.dataTypes.map(t => `<span class="port-badge" style="background-color: rgba(255,255,255,0.03); color: var(--text-main); border-color: var(--border-color);">${t}</span>`).join(" ");

        tr.appendChild(tdSource);
        tr.appendChild(tdName);
        tr.appendChild(tdDate);
        tr.appendChild(tdDataTypes);
        tbody.appendChild(tr);
      });
    }

  } catch (err) {
    clearTimeout(stage);
    addLog(`Breach lookup failed: ${err.message}`, "error");
    statsDiv.innerText = "Scan failed.";
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color: var(--status-red);">ERROR: ${err.message}</td></tr>`;
  } finally {
    updateSearchStage("", false);
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
  updateSearchStage("Reading image file buffer...");

  try {
    const data = await window.ghostHoundAPI.extractEXIF(filePath);
    state.exifData = data;

    if (data.error) {
      throw new Error(data.error);
    }

    addLog(`[OSINT] Image EXIF read completed: ${data.fileName}`, "success");

    // Build values display
    const metaListHtml = `
      <div class="exif-meta-item"><span class="exif-label">Filename:</span><span class="exif-val">${data.fileName}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Date Taken:</span><span class="exif-val">${data.dateTaken}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Camera Model:</span><span class="exif-val">${data.cameraModel}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Manufacturer:</span><span class="exif-val">${data.cameraMake}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Software:</span><span class="exif-val">${data.software}</span></div>
      <div class="exif-meta-item"><span class="exif-label">Image Resolution:</span><span class="exif-val">${data.dimensions}</span></div>
    `;

    // Check GPS data
    let mapCardHtml = `
      <div class="gps-embed-placeholder">
        <span class="gps-icon" style="color: var(--text-muted);">📍</span>
        <h4 style="font-size: 11px; font-weight:600; color: var(--text-secondary);">NO GPS COORDINATES DETECTED</h4>
        <p style="font-size: 10px; color: var(--text-muted);">Image file contains no embedded location metadata.</p>
      </div>
    `;

    if (data.gps) {
      mapCardHtml = `
        <div class="gps-embed-placeholder" style="border-color: rgba(239, 68, 68, 0.2); background-color: rgba(239, 68, 68, 0.01);">
          <span class="gps-icon">📍</span>
          <h4 style="color: var(--status-red); font-size:11px; font-weight:600; font-family: var(--title-font);">GPS LOCATOR TARGET LOCKED</h4>
          <p style="font-size:11px; color: var(--text-secondary);">Coordinates: ${data.gps.latitude.toFixed(6)}, ${data.gps.longitude.toFixed(6)}</p>
          <button class="btn-gps" onclick="window.open('${data.gps.googleMapsLink}', '_blank')">OPEN GOOGLE MAPS</button>
        </div>
      `;
    }

    exifResultsArea.innerHTML = `
      <div class="exif-results-container" style="margin-top: 15px;">
        <div class="exif-card">
          <h3>EXIF DATA SUMMARY</h3>
          <div class="exif-meta-list">${metaListHtml}</div>
        </div>
        <div class="exif-card map-card">
          <h3>GEOLOCATION</h3>
          ${mapCardHtml}
        </div>
      </div>
      <button class="btn-primary" style="margin-top: 15px;" onclick="resetExifView()">TRY ANOTHER IMAGE</button>
    `;
    
    exifResultsArea.style.display = "block";
    exifDropZone.style.display = "none";

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
    updateSearchStage("", false);
    showLoader(false);
  }
}

// Reset view to uploader dropzone
window.resetExifView = () => {
  exifResultsArea.style.display = "none";
  exifDropZone.style.display = "block";
  state.exifData = null;
  addLog("EXIF uploader reset.", "sys");
};

// Setup dropzone fallback click dialog
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
 * INTELLIGENT DATA EXPORTER
 * ----------------------------------------------------
 */

async function exportData(data, filename) {
  if (!data) {
    addLog("Export error: No target scan results to write.", "error");
    return;
  }

  addLog(`[SYSTEM] Attempting local data write to disc: ${filename}...`, "info");
  try {
    const result = await window.ghostHoundAPI.exportJSON(data, filename);
    if (result && result.success) {
      addLog(`[SYSTEM] Export successfully completed! Mapped output saved to: ${result.filePath}`, "success");
    } else if (result && result.error) {
      if (result.error.includes("canceled")) {
        addLog("[SYSTEM] Data write canceled by operator.", "sys");
      } else {
        addLog(`[SYSTEM] Export write failed: ${result.error}`, "error");
      }
    }
  } catch (err) {
    addLog(`[SYSTEM] Export write failed: ${err.message}`, "error");
  }
}

/**
 * ----------------------------------------------------
 * INTERACTION SPIN LOADER
 * ----------------------------------------------------
 */

function showLoader(visible) {
  if (visible) {
    loadingOverlay.classList.add("visible");
  } else {
    loadingOverlay.classList.remove("visible");
  }
}
