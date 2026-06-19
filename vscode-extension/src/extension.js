const vscode = require("vscode");
const { reviewCurrentFile } = require("./reviewFile");
const { reviewSelection } = require("./reviewSelection");
const { ReviewMateHoverProvider } = require("./hoverProvider");
const { updateDiagnostics } = require("./diagnosticsProvider");
const { ReviewPanel } = require("./views/ReviewPanel");

const reviewResults = new Map();

function activate(context) {
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("reviewmate");
  context.subscriptions.push(diagnosticCollection);

  const extensionContext = {
    diagnosticCollection,
    reviewResults,
    extensionContext: context,
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("reviewmate.reviewFile", () =>
      reviewCurrentFile(extensionContext)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("reviewmate.reviewSelection", () =>
      reviewSelection(extensionContext)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "reviewmate.generateImprovements",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage("No active editor");
          return;
        }
        const uri = editor.document.uri.toString();
        const result = reviewResults.get(uri);
        if (!result || !result.issues || result.issues.length === 0) {
          vscode.window.showInformationMessage(
            "Run a review first to generate improvements."
          );
          return;
        }
        const fixes = result.issues
          .filter((i) => i.fixSnippet || i.suggestion)
          .map(
            (i) =>
              `// [${i.severity}] ${i.category}: ${i.description}\n${i.fixSnippet || `// Suggestion: ${i.suggestion}`}`
          );
        if (fixes.length === 0) {
          vscode.window.showInformationMessage(
            "No actionable improvements found."
          );
          return;
        }
        const doc = await vscode.workspace.openTextDocument({
          content: fixes.join("\n\n"),
          language: editor.document.languageId,
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      }
    )
  );

  const hoverProvider = new ReviewMateHoverProvider(reviewResults);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ scheme: "file" }, hoverProvider)
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
