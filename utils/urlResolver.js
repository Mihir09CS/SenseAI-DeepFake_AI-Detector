const axios = require("axios");

const REQUEST_TIMEOUT_MS = 12000;
const HTML_MAX_CHARS = 1_000_000;

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function absoluteUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

function pickByRegex(html, regex, baseUrl) {
  const match = regex.exec(html);
  if (!match || !match[1]) return null;
  return absoluteUrl(baseUrl, match[1]);
}

function extractMediaUrlFromHtml(html, baseUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:video:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:audio["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<video[^>]+src=["']([^"']+)["']/i,
    /<source[^>]+src=["']([^"']+)["']/i,
    /<audio[^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const found = pickByRegex(html, pattern, baseUrl);
    if (found) return found;
  }

  return null;
}

async function resolveScanUrl(inputUrl) {
  if (!isHttpUrl(inputUrl)) {
    throw new Error("Please provide a valid http/https URL");
  }

  // AI service has dedicated youtube extraction through yt-dlp.
  if (/youtube\.com|youtu\.be/i.test(inputUrl)) {
    return inputUrl;
  }

  let headResponse;
  try {
    headResponse = await axios.head(inputUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
  } catch {
    headResponse = null;
  }

  const finalUrlFromHead = headResponse?.request?.res?.responseUrl || inputUrl;
  const headContentType = (headResponse?.headers?.["content-type"] || "").toLowerCase();

  if (
    headContentType.startsWith("image/") ||
    headContentType.startsWith("audio/") ||
    headContentType.startsWith("video/")
  ) {
    return finalUrlFromHead;
  }

  const response = await axios.get(finalUrlFromHead, {
    timeout: REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    responseType: "text",
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const finalUrl = response.request?.res?.responseUrl || finalUrlFromHead;
  const contentType = (response.headers?.["content-type"] || "").toLowerCase();

  if (
    contentType.startsWith("image/") ||
    contentType.startsWith("audio/") ||
    contentType.startsWith("video/")
  ) {
    return finalUrl;
  }

  if (contentType.includes("text/html")) {
    const html = String(response.data || "").slice(0, HTML_MAX_CHARS);
    const extracted = extractMediaUrlFromHtml(html, finalUrl);
    return extracted || finalUrl;
  }

  return finalUrl;
}

module.exports = {
  resolveScanUrl,
};
