const vscode = require("vscode");
const https = require("https");
const http = require("http");
const { URL } = require("url");

async function reviewSnippet(apiUrl, apiKey, code, language, persona, filePath) {
  const payload = JSON.stringify({
    code,
    language,
    persona,
    filePath,
  });

  const url = new URL("/api/review-snippet", apiUrl);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error(`Invalid JSON response: ${body.slice(0, 200)}`));
            }
          } else {
            reject(
              new Error(
                `API returned ${res.statusCode}: ${body.slice(0, 300)}`
              )
            );
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error("Request timed out after 60s"));
    });
    req.write(payload);
    req.end();
  });
}

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("reviewmate");
  return {
    apiUrl: cfg.get("apiUrl", "https://reviewmate-backend.up.railway.app"),
    apiKey: cfg.get("apiKey", ""),
    persona: cfg.get("persona", "SENIOR_ENGINEER"),
  };
}

module.exports = { reviewSnippet, getConfig };
