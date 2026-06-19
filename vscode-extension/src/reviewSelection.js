const vscode = require("vscode");
const { reviewSnippet, getConfig } = require("./api");
const { updateDiagnostics } = require("./diagnosticsProvider");
const { ReviewPanel } = require("./views/ReviewPanel");

async function reviewSelection(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor.");
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage("Select code to review.");
    return;
  }

  const code = editor.document.getText(selection);
  const language = editor.document.languageId;
  const filePath = editor.document.fileName;
  const uri = editor.document.uri.toString();
  const startLine = selection.start.line;
  const { apiUrl, apiKey, persona } = getConfig();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "ReviewMate: Reviewing selection…",
      cancellable: false,
    },
    async () => {
      try {
        const result = await reviewSnippet(
          apiUrl,
          apiKey,
          code,
          language,
          persona,
          filePath
        );

        const issues = result.issues || result.data?.issues || [];
        const offsetIssues = issues.map((issue) => ({
          ...issue,
          line: (issue.line || 1) + startLine,
        }));

        const existing = context.reviewResults.get(uri);
        const merged = existing
          ? { ...existing, issues: [...(existing.issues || []), ...offsetIssues], score: result.score ?? existing.score }
          : { ...result, issues: offsetIssues };
        context.reviewResults.set(uri, merged);

        updateDiagnostics(
          context.diagnosticCollection,
          editor.document.uri,
          merged.issues
        );

        ReviewPanel.show(context.extensionContext, result, filePath);

        const issueCount = issues.length;
        const score = result.score ?? result.data?.score ?? "N/A";
        vscode.window.showInformationMessage(
          `ReviewMate: Selection score ${score}/100 — ${issueCount} issue${issueCount !== 1 ? "s" : ""} found`
        );
      } catch (err) {
        vscode.window.showErrorMessage(`ReviewMate: ${err.message}`);
      }
    }
  );
}

module.exports = { reviewSelection };
