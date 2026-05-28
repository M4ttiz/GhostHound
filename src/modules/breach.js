const axios = require("axios");

// Simple email regex validation
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function searchBreach(email) {
  if (!isValidEmail(email)) {
    throw new Error(`Invalid email address format: ${email}`);
  }

  const results = [];
  const timeoutMs = 10000; // 10 seconds timeout

  // 1. Check LeakCheck.io (Public free tier)
  const leakCheckPromise = axios.get(`https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`, {
    timeout: timeoutMs,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 OSINT/GhostHound"
    }
  }).then(response => {
    const data = response.data;
    if (data && data.success && Array.isArray(data.sources)) {
      data.sources.forEach(item => {
        results.push({
          source: "LeakCheck (Public)",
          breachName: item.name || "Unknown Leak",
          date: item.date || "Unknown",
          dataTypes: ["Email", "Password/Hash (Potential)"]
        });
      });
    }
  }).catch(err => {
    // Graceful error logging
    console.error("LeakCheck API error or rate-limited:", err.message);
  });

  // 2. Check XposedOrNot (Free public tier)
  // Note: XposedOrNot returns 404 if the email is not found in breaches. We should catch 404 and handle it gracefully.
  const xposedOrNotPromise = axios.get(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`, {
    timeout: timeoutMs,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 OSINT/GhostHound"
    }
  }).then(response => {
    const data = response.data;
    // XposedOrNot can return breaches in response.data.breaches or response.data.search_result.breaches
    let breaches = [];
    if (data) {
      if (Array.isArray(data.breaches)) {
        breaches = data.breaches;
      } else if (data.search_result && Array.isArray(data.search_result.breaches)) {
        breaches = data.search_result.breaches;
      }
    }

    breaches.forEach(item => {
      if (typeof item === "string") {
        results.push({
          source: "XposedOrNot",
          breachName: item,
          date: "Unknown",
          dataTypes: ["Email", "PII Data"]
        });
      } else if (typeof item === "object") {
        results.push({
          source: "XposedOrNot",
          breachName: item.breach || "Unknown",
          date: item.date || "Unknown",
          dataTypes: Array.isArray(item.dataTypes) ? item.dataTypes : ["Email", "PII Data"]
        });
      }
    });
  }).catch(err => {
    if (err.response && err.response.status === 404) {
      // 404 is the standard way XposedOrNot indicates the email is NOT found (safe status)
      console.log(`XposedOrNot: ${email} not found in any public breaches.`);
    } else {
      console.error("XposedOrNot API error or rate-limited:", err.message);
    }
  });

  // Execute both concurrently
  await Promise.allSettled([leakCheckPromise, xposedOrNotPromise]);

  return results;
}

module.exports = {
  searchBreach,
  isValidEmail
};
