const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up',
  'this', 'that', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'what', 'which', 'who', 'whom', 'use', 'using', 'also',
]);

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function getTopKeywords(issues, topN = 20) {
  const freq = {};
  for (const issue of issues) {
    const words = normalizeText(issue.description);
    const unique = new Set(words);
    for (const word of unique) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function extractKeywords(text, topKeywordsSet) {
  const words = normalizeText(text);
  return new Set(words.filter((w) => topKeywordsSet.has(w)));
}

function clusterIssues(issues, topKeywords) {
  const topSet = new Set(topKeywords);
  const issueKeywords = issues.map((issue) => ({
    issue,
    keywords: extractKeywords(issue.description, topSet),
  }));

  const visited = new Set();
  const clusters = [];

  for (let i = 0; i < issueKeywords.length; i++) {
    if (visited.has(i)) continue;

    const cluster = [i];
    visited.add(i);

    for (let j = i + 1; j < issueKeywords.length; j++) {
      if (visited.has(j)) continue;

      let shared = 0;
      for (const kw of issueKeywords[i].keywords) {
        if (issueKeywords[j].keywords.has(kw)) {
          shared++;
          if (shared >= 2) break;
        }
      }

      if (shared >= 2) {
        cluster.push(j);
        visited.add(j);
      }
    }

    if (cluster.length > 0) {
      const clusterKeywordFreq = {};
      const severityCounts = { INFO: 0, WARNING: 0, CRITICAL: 0 };
      const sampleDescriptions = [];

      for (const idx of cluster) {
        const ik = issueKeywords[idx];
        for (const kw of ik.keywords) {
          clusterKeywordFreq[kw] = (clusterKeywordFreq[kw] || 0) + 1;
        }
        severityCounts[ik.issue.severity] = (severityCounts[ik.issue.severity] || 0) + 1;
        if (sampleDescriptions.length < 3) {
          sampleDescriptions.push(ik.issue.description);
        }
      }

      const topClusterKeywords = Object.entries(clusterKeywordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => w);

      clusters.push({
        name: topClusterKeywords.join(' / ') || 'miscellaneous',
        count: cluster.length,
        severityDistribution: severityCounts,
        sampleDescriptions,
      });
    }
  }

  clusters.sort((a, b) => b.count - a.count);
  return clusters;
}

async function getInsights(prisma, repoId) {
  const issues = await prisma.issue.findMany({
    where: {
      review: {
        repositoryId: repoId,
      },
    },
    select: {
      id: true,
      description: true,
      severity: true,
      category: true,
    },
  });

  if (issues.length === 0) {
    return {
      topIssues: [],
      categoryBreakdown: [],
    };
  }

  const topKeywords = getTopKeywords(issues, 20);
  const topIssues = clusterIssues(issues, topKeywords);

  const categoryCounts = {};
  const allCategories = ['SECURITY', 'PERFORMANCE', 'STYLE', 'BUG', 'TESTING'];
  for (const cat of allCategories) {
    categoryCounts[cat] = 0;
  }
  for (const issue of issues) {
    categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
  }

  const total = issues.length;
  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    topIssues: topIssues.slice(0, 10),
    categoryBreakdown,
  };
}

module.exports = { getInsights };
