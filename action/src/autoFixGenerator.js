const EXTENSION_TO_LANGUAGE = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'html',
  htm: 'html',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  md: 'markdown',
  xml: 'xml',
  kt: 'kotlin',
  swift: 'swift',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  php: 'php',
  r: 'r',
  dart: 'dart',
};

function inferLanguage(filename) {
  if (!filename) return 'plaintext';
  const ext = filename.split('.').pop().toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

export function generateAutoFixes(issues) {
  return issues.map((issue) => {
    if (!issue.fixSnippet) return issue;

    return {
      ...issue,
      fixLanguage: issue.fixLanguage || inferLanguage(issue.file),
    };
  });
}
