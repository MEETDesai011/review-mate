export async function generateReleaseNotes(genAI, prTitle, prBody, files) {
  const fileList = files.map((f) => `- ${f.filename} (${f.status})`).join('\n');

  const prompt = `You are a technical writer generating concise changelog entries for a software release.

Given this merged Pull Request, generate structured release notes.

**PR Title:** ${prTitle || 'Untitled PR'}
**PR Description:** ${prBody || 'No description provided.'}

**Files Changed:**
${fileList}

Respond with STRICT JSON matching this exact schema:

{
  "added": ["verb-led descriptions of new features or files, max 5 items"],
  "improved": ["verb-led descriptions of enhancements or refactors, max 5 items"],
  "fixed": ["verb-led descriptions of bug fixes, max 5 items"]
}

Rules:
- Each item is plain English, verb-led (e.g., "Add user authentication flow", "Fix null pointer in payment handler")
- No PR numbers, no issue references, no markdown
- Max 5 items per category
- Empty array if no items fit a category
- Keep items concise (under 80 characters each)`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      added: Array.isArray(parsed.added) ? parsed.added.slice(0, 5) : [],
      improved: Array.isArray(parsed.improved) ? parsed.improved.slice(0, 5) : [],
      fixed: Array.isArray(parsed.fixed) ? parsed.fixed.slice(0, 5) : [],
    };
  } catch (err) {
    console.error(`[ReviewMate] Release notes generation failed: ${err.message}`);
    return {
      added: [prTitle || 'Untitled change'],
      improved: [],
      fixed: [],
    };
  }
}
