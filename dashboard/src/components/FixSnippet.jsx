import { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';

export default function FixSnippet({ code, language = 'javascript' }) {
  const codeRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const lang = language?.toLowerCase().replace(/^\./, '') || 'javascript';
  const prismLang = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    yml: 'yaml',
    sh: 'bash',
  }[lang] || lang;

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, prismLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          background: copied ? 'rgba(46, 160, 67, 0.2)' : 'rgba(88, 166, 255, 0.1)',
          color: copied ? '#2EA043' : '#58A6FF',
          border: `1px solid ${copied ? 'rgba(46, 160, 67, 0.3)' : 'rgba(88, 166, 255, 0.2)'}`,
          borderRadius: 6,
          cursor: 'pointer',
          zIndex: 2,
          transition: 'all 0.2s ease',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {copied ? '✓ Copied' : '📋 Copy Fix'}
      </button>
      <pre className={`language-${prismLang}`} style={{ margin: 0 }}>
        <code ref={codeRef} className={`language-${prismLang}`}>
          {code}
        </code>
      </pre>
    </div>
  );
}
