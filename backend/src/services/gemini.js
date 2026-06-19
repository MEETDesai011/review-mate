const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

async function generateReleaseNotes(prTitle, prBody, filesChanged) {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a technical writer generating user-facing release notes for a merged pull request.

PR Title: ${prTitle}
PR Description: ${prBody || 'No description provided.'}
Files Changed: ${Array.isArray(filesChanged) ? filesChanged.join(', ') : 'Not specified'}

Generate release notes as a JSON object with exactly three arrays:
- "added": new features or capabilities (max 5 items)
- "improved": enhancements to existing features (max 5 items)
- "fixed": bug fixes or corrections (max 5 items)

Rules:
- Each item must be a verb-led plain English sentence (e.g., "Add dark mode toggle to settings page")
- Do NOT include PR numbers, issue numbers, or commit hashes
- Do NOT include author names
- Keep each item to one concise sentence
- If a category has no relevant items, return an empty array

Return ONLY valid JSON, no markdown fences, no explanation.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      added: Array.isArray(parsed.added) ? parsed.added.slice(0, 5) : [],
      improved: Array.isArray(parsed.improved) ? parsed.improved.slice(0, 5) : [],
      fixed: Array.isArray(parsed.fixed) ? parsed.fixed.slice(0, 5) : [],
    };
  } catch (err) {
    console.error('[Gemini] Release notes generation failed:', err.message);
    return {
      added: [`Add changes from: ${prTitle}`],
      improved: [],
      fixed: [],
    };
  }
}

async function reviewSnippet(code, language, persona, filePath) {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const personaDescriptions = {
      SENIOR_ENGINEER: 'a senior software engineer focused on code quality, readability, and maintainability',
      SECURITY_ENGINEER: 'a security engineer focused on vulnerabilities, injection attacks, auth issues, and data exposure',
      PERFORMANCE_ENGINEER: 'a performance engineer focused on algorithmic complexity, memory usage, and runtime efficiency',
      STARTUP_CTO: 'a startup CTO balancing speed-to-ship with technical debt and scalability',
    };

    const personaDesc = personaDescriptions[persona] || personaDescriptions.SENIOR_ENGINEER;

    const prompt = `You are ${personaDesc}. Review the following code snippet and provide feedback.

File: ${filePath || 'unknown'}
Language: ${language || 'unknown'}

\`\`\`${language || ''}
${code}
\`\`\`

Provide your review as a JSON object with these fields:
- "score": number 0-100 representing overall code quality
- "summary": a 1-2 sentence overall assessment
- "positives": array of strings noting what's done well (max 3)
- "issues": array of objects, each with:
  - "lineNumber": approximate line number in the snippet
  - "severity": "INFO" | "WARNING" | "CRITICAL"
  - "category": "SECURITY" | "PERFORMANCE" | "STYLE" | "BUG" | "TESTING"
  - "description": what the issue is
  - "suggestion": how to fix it
  - "fixSnippet": corrected code (if applicable, otherwise null)

Return ONLY valid JSON, no markdown fences, no explanation. Max 10 issues.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      score: typeof parsed.score === 'number' ? parsed.score : 50,
      summary: parsed.summary || 'Review completed.',
      positives: Array.isArray(parsed.positives) ? parsed.positives.slice(0, 3) : [],
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.slice(0, 10).map((issue) => ({
            lineNumber: issue.lineNumber || 1,
            severity: ['INFO', 'WARNING', 'CRITICAL'].includes(issue.severity) ? issue.severity : 'INFO',
            category: ['SECURITY', 'PERFORMANCE', 'STYLE', 'BUG', 'TESTING'].includes(issue.category) ? issue.category : 'STYLE',
            description: issue.description || '',
            suggestion: issue.suggestion || null,
            fixSnippet: issue.fixSnippet || null,
          }))
        : [],
    };
  } catch (err) {
    console.error('[Gemini] Snippet review failed:', err.message);
    return {
      score: 50,
      summary: 'AI review could not be completed. Please try again.',
      positives: [],
      issues: [],
    };
  }
}

module.exports = { generateReleaseNotes, reviewSnippet };
