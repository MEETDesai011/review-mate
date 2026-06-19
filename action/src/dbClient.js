export async function submitReview(apiUrl, apiKey, reviewPayload) {
  try {
    const response = await fetch(`${apiUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ReviewMate-API-Key': apiKey,
      },
      body: JSON.stringify(reviewPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ReviewMate] Backend responded with ${response.status}: ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`[ReviewMate] Failed to submit review to backend: ${err.message}`);
    return null;
  }
}

export async function submitReleaseNotes(apiUrl, apiKey, payload) {
  try {
    const response = await fetch(`${apiUrl}/api/releasenotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ReviewMate-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ReviewMate] Release notes submission failed with ${response.status}: ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`[ReviewMate] Failed to submit release notes: ${err.message}`);
    return null;
  }
}
