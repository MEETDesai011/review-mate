const vscode = require("vscode");
const { reviewSnippet, getConfig } = require("./api");
const { updateDiagnostics } = require("./diagnosticsProvider");
const { ReviewPanel } = require("./views/ReviewPanel");

async function reviewCurrentFile(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor to review.");
    return;
  }

  const document = editor.document;
  const code = document.getText();
  const language = document.languageId;
  const filePath = document.fileName;
  const uri = document.uri.toString();
  const { apiUrl, apiKey, persona } = getConfig();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "ReviewMate: Reviewing file…",
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

        context.reviewResults.set(uri, result);

        const issues = result.issues || result.data?.issues || [];
        updateDiagnostics(context.diagnosticCollection, document.uri, issues);

        ReviewPanel.show(context.extensionContext, result, filePath);

        const issueCount = issues.length;
        const score = result.score ?? result.data?.score ?? "N/A";
        vscode.window.showInformationMessage(
          `ReviewMate: Score ${score}/100 — ${issueCount} issue${issueCount !== 1 ? "s" : ""} found`
        );
      } catch (err) {
        vscode.window.showErrorMessage(`ReviewMate: ${err.message}`);
      }
    }
  );
}

module.exports = { reviewCurrentFile };
