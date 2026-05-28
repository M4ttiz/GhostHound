import axios from "axios";

export interface SherlockResult {
  platform: string;
  url: string;
  found: boolean;
  avatar?: string;
}

const platforms: Record<string, string> = {
  GitHub: "https://github.com/{username}",
  Reddit: "https://www.reddit.com/user/{username}",
  Twitter: "https://x.com/{username}",
  Instagram: "https://www.instagram.com/{username}",
  TikTok: "https://www.tiktok.com/@{username}",
  LinkedIn: "https://www.linkedin.com/in/{username}",
  Telegram: "https://t.me/{username}",
  Medium: "https://medium.com/@{username}",
  DeviantArt: "https://www.deviantart.com/{username}",
  Pinterest: "https://www.pinterest.com/{username}",
  Twitch: "https://www.twitch.tv/{username}",
  YouTube: "https://www.youtube.com/@{username}",
  Pastebin: "https://pastebin.com/u/{username}",
  HackerNews: "https://news.ycombinator.com/user?id={username}",
  GitLab: "https://gitlab.com/{username}",
  Codecademy: "https://www.codecademy.com/profiles/{username}",
  Roblox: "https://www.roblox.com/user.aspx?username={username}",
  Spotify: "https://open.spotify.com/user/{username}",
  Snapchat: "https://www.snapchat.com/add/{username}",
  Facebook: "https://www.facebook.com/{username}",
};

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function checkPlatform(
  platform: string,
  username: string
): Promise<SherlockResult> {
  const urlTemplate = platforms[platform];
  if (!urlTemplate) {
    return { platform, url: "", found: false };
  }

  const url = urlTemplate.replace("{username}", username);

  try {
    const response = await axios.head(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
      },
      timeout: 5000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    const found = response.status >= 200 && response.status < 400;
    return { platform, url, found };
  } catch (error) {
    return { platform, url, found: false };
  }
}

export async function searchUsername(username: string): Promise<SherlockResult[]> {
  const results: SherlockResult[] = [];
  const platformNames = Object.keys(platforms);

  for (const platform of platformNames) {
    const result = await checkPlatform(platform, username);
    results.push(result);
  }

  return results;
}
