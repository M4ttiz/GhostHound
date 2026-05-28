const fs = require("fs");
const dns = require("dns").promises;
const axios = require("axios");
const cheerio = require("cheerio");
const whois = require("whois-json");
const exifParser = require("exif-parser");
const { searchBreach } = require("./breach");

// Check if input is a valid IP address
function isIP(address) {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(address);
}

// Timeout helper for axios
const AXIOS_CONFIG = {
  timeout: 10000, // 10s timeout
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  }
};

/**
 * 1. Username OSINT (Sherlock-style)
 * Checks 15 platforms in parallel.
 */
async function checkUsername(username) {
  if (!username || typeof username !== "string") {
    throw new Error("Invalid username provided");
  }

  // Sanitized username
  const target = username.replace(/^@/, "").trim();

  // Platforms configuration
  const platforms = [
    {
      name: "GitHub",
      url: `https://github.com/${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "Reddit",
      url: `https://www.reddit.com/user/${target}/about.json`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        // Reddit returns user info JSON if found. If suspended or not found, it returns 404.
        return res.status === 200 && res.data && res.data.data;
      }
    },
    {
      name: "Twitter/X",
      url: `https://twitter.com/${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "Instagram",
      url: `https://www.instagram.com/${target}/`,
      check: async (url) => {
        // Instagram redirects to login page or 404. Check for 200 and absence of login/authwall signatures if possible.
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200 && !res.data.includes("login");
      }
    },
    {
      name: "TikTok",
      url: `https://www.tiktok.com/@${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "LinkedIn",
      url: `https://www.linkedin.com/in/${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200 && !res.data.includes("authwall");
      }
    },
    {
      name: "Telegram",
      url: `https://t.me/${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        const $ = cheerio.load(res.data);
        // Telegram channel/user pages have 'tgme_page_extra' for existing accounts.
        // For non-existent accounts, it has "If you have Telegram, you can contact..." and no 'tgme_page_extra'
        return $(".tgme_page_extra").length > 0;
      }
    },
    {
      name: "Medium",
      url: `https://medium.com/@${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "DeviantArt",
      url: `https://www.deviantart.com/${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "Pinterest",
      url: `https://www.pinterest.com/${target}/`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "Twitch",
      url: `https://www.twitch.tv/${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "YouTube",
      url: `https://www.youtube.com/@${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "Pastebin",
      url: `https://pastebin.com/u/${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    },
    {
      name: "HackerNews",
      url: `https://news.ycombinator.com/user?id=${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        // HackerNews returns 200 status but says "No such user." in the body
        return res.status === 200 && !res.data.includes("No such user.");
      }
    },
    {
      name: "GitLab",
      url: `https://gitlab.com/${target}`,
      check: async (url) => {
        const res = await axios.get(url, AXIOS_CONFIG);
        return res.status === 200;
      }
    }
  ];

  // Perform checks in parallel via Promise.allSettled
  const results = await Promise.allSettled(
    platforms.map(async (platform) => {
      try {
        const isFound = await platform.check(platform.url);
        return {
          platform: platform.name,
          url: platform.url,
          found: !!isFound,
          status: isFound ? "FOUND" : "NOT FOUND"
        };
      } catch (err) {
        // 404 means the user does not exist
        if (err.response && err.response.status === 404) {
          return {
            platform: platform.name,
            url: platform.url,
            found: false,
            status: "NOT FOUND"
          };
        }
        // Handle blocked/rate-limited/network issues
        return {
          platform: platform.name,
          url: platform.url,
          found: false,
          status: `ERROR (${err.response ? err.response.status : "CONN_TIMEOUT"})`
        };
      }
    })
  );

  return results.map((r) => r.value || { platform: "Unknown", found: false, status: "ERROR" });
}

/**
 * 2. Domain & IP OSINT
 * Performs WHOIS, DNS queries, Shodan lookup, GeoIP, and Reverse IP search.
 */
async function investigateDomain(target) {
  if (!target || typeof target !== "string") {
    throw new Error("Invalid target domain or IP provided");
  }

  const cleanTarget = target.trim().toLowerCase();
  const results = {
    target: cleanTarget,
    isIP: isIP(cleanTarget),
    resolvedIP: null,
    dns: null,
    whois: null,
    shodan: null,
    geoip: null,
    reverseIp: null
  };

  let lookupIP = null;

  // DNS and IP Resolution
  if (results.isIP) {
    lookupIP = cleanTarget;
    results.resolvedIP = cleanTarget;
    // Reverse DNS check for IP
    try {
      const hostnames = await dns.reverse(cleanTarget);
      results.dns = { PTR: hostnames };
    } catch (e) {
      results.dns = { PTR: ["Lookup failed or no PTR record"] };
    }
  } else {
    // Resolve Domain to IP and get DNS records
    const dnsRecords = {};
    try {
      const aRecords = await dns.resolve4(cleanTarget);
      dnsRecords.A = aRecords;
      if (aRecords && aRecords.length > 0) {
        lookupIP = aRecords[0];
        results.resolvedIP = lookupIP;
      }
    } catch (e) {
      dnsRecords.A = ["Resolution failed"];
    }

    try {
      const mxRecords = await dns.resolveMx(cleanTarget);
      dnsRecords.MX = mxRecords.map(mx => `${mx.priority} ${mx.exchange}`);
    } catch (e) {
      dnsRecords.MX = ["None"];
    }

    try {
      const txtRecords = await dns.resolveTxt(cleanTarget);
      dnsRecords.TXT = txtRecords.flat();
    } catch (e) {
      dnsRecords.TXT = ["None"];
    }

    try {
      const nsRecords = await dns.resolveNs(cleanTarget);
      dnsRecords.NS = nsRecords;
    } catch (e) {
      dnsRecords.NS = ["None"];
    }

    results.dns = dnsRecords;
  }

  // Execute remaining tasks concurrently
  const jobs = [];

  // WHOIS details
  jobs.push(
    whois(cleanTarget)
      .then(whoisData => {
        results.whois = whoisData;
      })
      .catch(err => {
        results.whois = { error: `WHOIS inquiry failed: ${err.message}` };
      })
  );

  // If we have a valid IP (resolved or direct), gather Geolocation, Shodan, and Reverse IP
  if (lookupIP) {
    // GeoIP lookup
    jobs.push(
      axios.get(`http://ip-api.com/json/${lookupIP}`, { timeout: 8000 })
        .then(res => {
          results.geoip = res.data;
        })
        .catch(err => {
          results.geoip = { error: `GeoIP failed: ${err.message}` };
        })
    );

    // Shodan InternetDB
    jobs.push(
      axios.get(`https://internetdb.shodan.io/${lookupIP}`, { timeout: 8000 })
        .then(res => {
          results.shodan = res.data;
        })
        .catch(err => {
          // Shodan returns 404 if no open ports are indexed
          if (err.response && err.response.status === 404) {
            results.shodan = { ports: [], vulns: [], tags: [], hostnames: [], cpes: [], message: "No data found in Shodan InternetDB" };
          } else {
            results.shodan = { error: `Shodan lookup failed: ${err.message}` };
          }
        })
    );

    // Reverse IP Lookup (Hackertarget free)
    jobs.push(
      axios.get(`https://api.hackertarget.com/reverseiplookup/?q=${lookupIP}`, { timeout: 8000 })
        .then(res => {
          const body = res.data;
          if (body && !body.includes("API count exceeded")) {
            results.reverseIp = body.split("\n").map(d => d.trim()).filter(d => d.length > 0);
          } else {
            results.reverseIp = ["Rate limit reached on HackerTarget API"];
          }
        })
        .catch(err => {
          results.reverseIp = [`Reverse IP failed: ${err.message}`];
        })
    );
  }

  await Promise.allSettled(jobs);
  return results;
}

/**
 * 3. EXIF Metadata Extractor
 * Reads a local image buffer, parses EXIF headers.
 */
function extractEXIF(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error(`File not found at: ${imagePath}`);
  }

  try {
    const buffer = fs.readFileSync(imagePath);
    const parser = exifParser.create(buffer);
    const parsed = parser.parse();

    const tags = parsed.tags || {};
    const imageSize = parsed.imageSize || {};

    // Get date taken
    let dateTaken = "N/A";
    if (tags.CreateDate) {
      dateTaken = new Date(tags.CreateDate * 1000).toLocaleString();
    } else if (tags.DateTimeOriginal) {
      dateTaken = new Date(tags.DateTimeOriginal * 1000).toLocaleString();
    }

    return {
      fileName: imagePath.split(/[\\/]/).pop(),
      dateTaken,
      cameraModel: tags.Model || "Unknown Model",
      cameraMake: tags.Make || "Unknown Manufacturer",
      software: tags.Software || "Unknown Software",
      dimensions: imageSize.width && imageSize.height ? `${imageSize.width} x ${imageSize.height} px` : "Unknown",
      gps: tags.GPSLatitude && tags.GPSLongitude ? {
        latitude: tags.GPSLatitude,
        longitude: tags.GPSLongitude,
        googleMapsLink: `https://www.google.com/maps/place/${tags.GPSLatitude},${tags.GPSLongitude}`
      } : null,
      rawTags: tags
    };
  } catch (err) {
    throw new Error(`Failed to parse image EXIF data: ${err.message}`);
  }
}

module.exports = {
  checkUsername,
  investigateDomain,
  extractEXIF,
  searchBreach
};
