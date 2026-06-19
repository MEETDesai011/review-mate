const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg', 'webp', 'avif',
  'mp4', 'mp3', 'wav', 'ogg', 'webm', 'avi', 'mov',
  'zip', 'tar', 'gz', 'bz2', 'rar', '7z',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'exe', 'dll', 'so', 'dylib', 'bin',
  'lock',
]);

function isBinary(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export async function getDiff(octokit, owner, repo, pullNumber) {
  const files = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: perPage,
      page,
    });

    if (data.length === 0) break;

    for (const file of data) {
      if (isBinary(file.filename)) continue;
      if (!file.patch) continue;

      files.push({
        filename: file.filename,
        status: file.status,
        patch: file.patch,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      });
    }

    if (data.length < perPage) break;
    page++;
  }

  return files;
}
