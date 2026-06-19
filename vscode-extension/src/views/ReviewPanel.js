const vscode = require("vscode");
const path = require("path");

class ReviewPanel {
  static _panel = null;

  static show(extensionContext, result, filePath) {
    const column = vscode.ViewColumn.Beside;

    if (ReviewPanel._panel) {
      ReviewPanel._panel.reveal(column);
    } else {
      ReviewPanel._panel = vscode.window.createWebviewPanel(
        "reviewmateResults",
        "ReviewMate Results",
        column,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      ReviewPanel._panel.onDidDispose(() => {
        ReviewPanel._panel = null;
      });
    }

    ReviewPanel._panel.webview.onDidReceiveMessage((msg) => {
      if (msg.command === "copyFix") {
        vscode.env.clipboard.writeText(msg.text).then(() => {
          vscode.window.showInformationMessage("Fix copied to clipboard.");
        });
      }
    });

    ReviewPanel._panel.webview.html = ReviewPanel._buildHtml(result, filePath);
  }

  static _buildHtml(result, filePath) {
    const score = result.score ?? result.data?.score ?? "—";
    const summary = result.summary || result.data?.summary || "";
    const issues = result.issues || result.data?.issues || [];
    const fileName = path.basename(filePath || "unknown");

    const severityColor = (s) => {
      switch ((s || "").toUpperCase()) {
        case "CRITICAL":
        case "ERROR":
          return "#f87171";
        case "WARNING":
          return "#fbbf24";
        case "INFO":
          return "#60a5fa";
        default:
          return "#a78bfa";
      }
    };

    const scoreColor =
      score >= 80 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";

    const issueRows = issues
      .map(
        (issue, idx) => `
      <div class="issue">
        <div class="issue-header">
          <span class="severity" style="background:${severityColor(issue.severity)}">${issue.severity || "INFO"}</span>
          <span class="category">${issue.category || "General"}</span>
          ${issue.line ? `<span class="line">Line ${issue.line}</span>` : ""}
        </div>
        <p class="desc">${escapeHtml(issue.description || issue.message || "")}</p>
        ${issue.suggestion ? `<p class="suggestion">💡 ${escapeHtml(issue.suggestion)}</p>` : ""}
        ${
          issue.fixSnippet
            ? `<div class="fix-block">
            <div class="fix-header">
              <span>Suggested Fix</span>
              <button class="copy-btn" onclick="copyFix(${idx})">📋 Copy</button>
            </div>
            <pre class="fix-code"><code>${escapeHtml(issue.fixSnippet)}</code></pre>
          </div>`
            : ""
        }
      </div>`
      )
      .join("");

    const fixSnippetsJson = JSON.stringify(
      issues.map((i) => i.fixSnippet || "")
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#0f172a; color:#e2e8f0; padding:24px; line-height:1.6; }
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid #1e293b; }
  .header h1 { font-size:20px; font-weight:600; color:#f8fafc; }
  .file-badge { background:#1e293b; padding:4px 12px; border-radius:6px; font-size:13px; color:#94a3b8; }
  .score-card { text-align:center; background:#1e293b; border-radius:12px; padding:24px; margin-bottom:24px; }
  .score-value { font-size:56px; font-weight:700; color:${scoreColor}; }
  .score-label { font-size:14px; color:#94a3b8; margin-top:4px; }
  .summary { background:#1e293b; border-radius:10px; padding:16px; margin-bottom:24px; font-size:14px; color:#cbd5e1; }
  .summary strong { color:#f8fafc; }
  .issues-title { font-size:16px; font-weight:600; margin-bottom:12px; color:#f8fafc; }
  .issue { background:#1e293b; border-radius:10px; padding:16px; margin-bottom:12px; border-left:3px solid #334155; }
  .issue-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
  .severity { padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; color:#0f172a; text-transform:uppercase; }
  .category { background:#334155; padding:2px 8px; border-radius:4px; font-size:11px; color:#e2e8f0; }
  .line { font-size:11px; color:#64748b; margin-left:auto; }
  .desc { font-size:14px; color:#e2e8f0; }
  .suggestion { font-size:13px; color:#a5b4fc; margin-top:6px; }
  .fix-block { margin-top:10px; background:#0f172a; border-radius:8px; overflow:hidden; }
  .fix-header { display:flex; justify-content:space-between; align-items:center; padding:6px 12px; background:#1a2332; font-size:12px; color:#94a3b8; }
  .copy-btn { background:#6366f1; color:#fff; border:none; padding:3px 10px; border-radius:4px; cursor:pointer; font-size:11px; }
  .copy-btn:hover { background:#818cf8; }
  .fix-code { padding:12px; font-size:13px; overflow-x:auto; color:#a5f3fc; }
  .empty { text-align:center; padding:40px; color:#64748b; }
</style>
</head>
<body>
  <div class="header">
    <h1>ReviewMate</h1>
    <span class="file-badge">${escapeHtml(fileName)}</span>
  </div>
  <div class="score-card">
    <div class="score-value">${score}</div>
    <div class="score-label">Quality Score</div>
  </div>
  ${summary ? `<div class="summary"><strong>Summary:</strong> ${escapeHtml(summary)}</div>` : ""}
  <div class="issues-title">Issues (${issues.length})</div>
  ${issues.length > 0 ? issueRows : '<div class="empty">No issues found — nice work! 🎉</div>'}
  <script>
    const vscode = acquireVsCodeApi();
    const fixes = ${fixSnippetsJson};
    function copyFix(idx) {
      vscode.postMessage({ command: 'copyFix', text: fixes[idx] });
    }
  </script>
</body>
</html>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { ReviewPanel };
