const vscode = require("vscode");

const SEVERITY_MAP = {
  CRITICAL: vscode.DiagnosticSeverity.Error,
  ERROR: vscode.DiagnosticSeverity.Error,
  WARNING: vscode.DiagnosticSeverity.Warning,
  WARN: vscode.DiagnosticSeverity.Warning,
  INFO: vscode.DiagnosticSeverity.Information,
  SUGGESTION: vscode.DiagnosticSeverity.Hint,
};

function updateDiagnostics(diagnosticCollection, uri, issues) {
  if (!issues || !Array.isArray(issues)) {
    diagnosticCollection.set(uri, []);
    return;
  }

  const diagnostics = issues.map((issue) => {
    const line = Math.max(0, (issue.line || 1) - 1);
    const endLine = issue.endLine ? Math.max(0, issue.endLine - 1) : line;
    const startChar = issue.column ? issue.column - 1 : 0;
    const endChar = issue.endColumn || 1000;

    const range = new vscode.Range(
      new vscode.Position(line, startChar),
      new vscode.Position(endLine, endChar)
    );

    const severity =
      SEVERITY_MAP[(issue.severity || "INFO").toUpperCase()] ||
      vscode.DiagnosticSeverity.Information;

    const category = issue.category || "General";
    const description = issue.description || issue.message || "Review issue";

    const diagnostic = new vscode.Diagnostic(
      range,
      `[${category}] ${description}`,
      severity
    );

    diagnostic.source = "ReviewMate";

    if (issue.fixSnippet) {
      diagnostic.code = {
        value: "fix-available",
        target: vscode.Uri.parse(""),
      };
    }

    if (issue.suggestion) {
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(uri, range),
          `Suggestion: ${issue.suggestion}`
        ),
      ];
    }

    return diagnostic;
  });

  diagnosticCollection.set(uri, diagnostics);
}

module.exports = { updateDiagnostics };
