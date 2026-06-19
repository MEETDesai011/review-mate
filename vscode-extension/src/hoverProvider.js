const vscode = require("vscode");

class ReviewMateHoverProvider {
  constructor(reviewResults) {
    this._reviewResults = reviewResults;
  }

  provideHover(document, position) {
    const uri = document.uri.toString();
    const result = this._reviewResults.get(uri);
    if (!result) return null;

    const issues = result.issues || result.data?.issues || [];
    const hoveredLine = position.line + 1;

    const matching = issues.filter((issue) => {
      const issueLine = issue.line || 1;
      const issueEndLine = issue.endLine || issueLine;
      return hoveredLine >= issueLine && hoveredLine <= issueEndLine;
    });

    if (matching.length === 0) return null;

    const parts = matching.map((issue) => {
      const severityIcon =
        issue.severity === "CRITICAL" || issue.severity === "ERROR"
          ? "🔴"
          : issue.severity === "WARNING"
            ? "🟡"
            : "🔵";

      const lines = [
        `${severityIcon} **ReviewMate — ${issue.severity || "INFO"}** \`${issue.category || "General"}\``,
        "",
        issue.description || issue.message || "",
      ];

      if (issue.suggestion) {
        lines.push("", `💡 **Suggestion:** ${issue.suggestion}`);
      }

      if (issue.fixSnippet) {
        lines.push("", "**Suggested fix:**", "```", issue.fixSnippet, "```");
      }

      return lines.join("\n");
    });

    const md = new vscode.MarkdownString(parts.join("\n\n---\n\n"));
    md.isTrusted = true;
    md.supportHtml = true;
    return new vscode.Hover(md);
  }
}

module.exports = { ReviewMateHoverProvider };
