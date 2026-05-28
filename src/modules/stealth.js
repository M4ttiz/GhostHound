const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
];

function getRandomUserAgent() {
  const index = Math.floor(Math.random() * userAgents.length);
  return userAgents[index];
}

function initStealth(sessionInstance) {
  if (!sessionInstance) {
    throw new Error("Electron session instance is required to initialize Stealth mode");
  }

  // 1. Prevent WebRTC leaks by disabling non-proxied UDP (only uses public/relay interfaces if proxy is set, otherwise blocks it)
  sessionInstance.setWebRTCIPHandlingPolicy("disable_non_proxied_udp");

  // 2. Intercept and alter request headers for maximum stealth
  const filter = { urls: ["http://*/*", "https://*/*"] };

  sessionInstance.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const customUA = getRandomUserAgent();
    
    // Set rotated User-Agent
    details.requestHeaders["User-Agent"] = customUA;
    
    // Remove potential identifying/tracking headers
    delete details.requestHeaders["X-Forwarded-For"];
    delete details.requestHeaders["X-Originating-IP"];
    delete details.requestHeaders["X-Remote-IP"];
    delete details.requestHeaders["X-Remote-Addr"];
    
    // Optional: strip referer when accessing external sites to avoid leaking source dashboard
    const requestUrl = new URL(details.url);
    if (!requestUrl.hostname.includes("localhost") && !requestUrl.hostname.includes("127.0.0.1")) {
      delete details.requestHeaders["Referer"];
    }

    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
}

module.exports = {
  getRandomUserAgent,
  initStealth
};
