from __future__ import annotations

import os
from typing import Optional

import httpx
from fastmcp import FastMCP

API_URL = os.environ.get("REVIEWMATE_API_URL", "https://reviewmate-backend.up.railway.app")
API_KEY = os.environ.get("REVIEWMATE_API_KEY", "")

mcp = FastMCP("ReviewMate")


def _headers() -> dict[str, str]:
    h = {"Content-Type": "application/json"}
    if API_KEY:
        h["Authorization"] = f"Bearer {API_KEY}"
    return h


async def _get(path: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(base_url=API_URL, headers=_headers(), timeout=30) as client:
        resp = await client.get(path, params=params)
        resp.raise_for_status()
        return resp.json()


@mcp.tool()
async def get_repo_reviews(repo_id: str, limit: int = 10) -> dict:
    """Get recent PR reviews for a repository. Returns review scores, authors, and issue counts."""
    try:
        data = await _get(f"/api/repos/{repo_id}")
        reviews = data if isinstance(data, list) else data.get("reviews", data.get("data", []))
        if isinstance(reviews, list):
            reviews = reviews[:limit]
        return {
            "repo_id": repo_id,
            "reviews": reviews,
            "count": len(reviews) if isinstance(reviews, list) else 0,
        }
    except httpx.HTTPStatusError as exc:
        return {"error": f"HTTP {exc.response.status_code}: {exc.response.text}", "repo_id": repo_id}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {exc}", "repo_id": repo_id}


@mcp.tool()
async def get_health_score(repo_id: str) -> dict:
    """Get the current health score and trend for a repository."""
    try:
        data = await _get(f"/api/analytics/{repo_id}")
        analytics = data if isinstance(data, dict) else {}
        reviews = analytics.get("reviews", [])
        scores = [r.get("score", 0) for r in reviews if isinstance(r, dict) and "score" in r]
        current_score = scores[0] if scores else analytics.get("currentScore", 0)
        avg_score = round(sum(scores) / len(scores), 2) if scores else analytics.get("avgScore", 0)

        if len(scores) >= 2:
            recent_half = scores[: len(scores) // 2]
            older_half = scores[len(scores) // 2 :]
            recent_avg = sum(recent_half) / len(recent_half)
            older_avg = sum(older_half) / len(older_half)
            trend = "improving" if recent_avg > older_avg else "declining" if recent_avg < older_avg else "stable"
        else:
            trend = analytics.get("trend", "stable")

        return {
            "repo_id": repo_id,
            "currentScore": current_score,
            "avgScore": avg_score,
            "trend": trend,
            "totalReviews": len(scores) if scores else analytics.get("totalReviews", 0),
        }
    except httpx.HTTPStatusError as exc:
        return {"error": f"HTTP {exc.response.status_code}: {exc.response.text}", "repo_id": repo_id}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {exc}", "repo_id": repo_id}


@mcp.tool()
async def get_issue_trends(repo_id: str) -> dict:
    """Get issue trends and category breakdown for a repository over time."""
    try:
        data = await _get(f"/api/analytics/{repo_id}")
        analytics = data if isinstance(data, dict) else {}
        reviews = analytics.get("reviews", [])

        severity_dist: dict[str, int] = {}
        category_dist: dict[str, int] = {}
        recent_trend: list[dict] = []

        for review in reviews if isinstance(reviews, list) else []:
            issues = review.get("issues", [])
            for issue in issues if isinstance(issues, list) else []:
                sev = issue.get("severity", "UNKNOWN")
                cat = issue.get("category", "UNKNOWN")
                severity_dist[sev] = severity_dist.get(sev, 0) + 1
                category_dist[cat] = category_dist.get(cat, 0) + 1
            recent_trend.append({
                "pr": review.get("prNumber", review.get("pr_number")),
                "issueCount": len(issues) if isinstance(issues, list) else 0,
                "score": review.get("score", 0),
            })

        return {
            "repo_id": repo_id,
            "severityDistribution": severity_dist or analytics.get("severityDistribution", {}),
            "categoryDistribution": category_dist or analytics.get("categoryDistribution", {}),
            "recentTrend": recent_trend[:20] or analytics.get("recentTrend", []),
        }
    except httpx.HTTPStatusError as exc:
        return {"error": f"HTTP {exc.response.status_code}: {exc.response.text}", "repo_id": repo_id}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {exc}", "repo_id": repo_id}


@mcp.tool()
async def compare_prs(repo_id: str, pr_number_a: int, pr_number_b: int) -> dict:
    """Compare two PR reviews side by side. Shows score differences and unique issues."""
    try:
        data = await _get(f"/api/analytics/{repo_id}")
        analytics = data if isinstance(data, dict) else {}
        reviews = analytics.get("reviews", data.get("data", []))

        review_a = None
        review_b = None
        for r in reviews if isinstance(reviews, list) else []:
            pr_num = r.get("prNumber", r.get("pr_number"))
            if pr_num == pr_number_a:
                review_a = r
            elif pr_num == pr_number_b:
                review_b = r

        if not review_a:
            return {"error": f"PR #{pr_number_a} not found in repo {repo_id}"}
        if not review_b:
            return {"error": f"PR #{pr_number_b} not found in repo {repo_id}"}

        score_a = review_a.get("score", 0)
        score_b = review_b.get("score", 0)
        issues_a = review_a.get("issues", [])
        issues_b = review_b.get("issues", [])
        cats_a = {i.get("category") for i in issues_a if isinstance(i, dict)}
        cats_b = {i.get("category") for i in issues_b if isinstance(i, dict)}

        return {
            "repo_id": repo_id,
            "pr_a": {
                "number": pr_number_a,
                "score": score_a,
                "issueCount": len(issues_a),
                "categories": sorted(cats_a),
            },
            "pr_b": {
                "number": pr_number_b,
                "score": score_b,
                "issueCount": len(issues_b),
                "categories": sorted(cats_b),
            },
            "scoreDiff": round(score_a - score_b, 2),
            "issueCountDiff": len(issues_a) - len(issues_b),
            "uniqueToA": sorted(cats_a - cats_b),
            "uniqueToB": sorted(cats_b - cats_a),
            "common": sorted(cats_a & cats_b),
        }
    except httpx.HTTPStatusError as exc:
        return {"error": f"HTTP {exc.response.status_code}: {exc.response.text}", "repo_id": repo_id}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {exc}", "repo_id": repo_id}


@mcp.tool()
async def get_top_issues(repo_id: str, category: Optional[str] = None) -> dict:
    """Get the most common recurring issues in a repository, optionally filtered by category."""
    try:
        data = await _get(f"/api/insights/{repo_id}")
        insights = data if isinstance(data, dict) else {}
        issues = insights.get("topIssues", insights.get("issues", insights.get("data", [])))

        if not isinstance(issues, list):
            issues = []

        if category:
            cat_lower = category.lower()
            issues = [i for i in issues if isinstance(i, dict) and i.get("category", "").lower() == cat_lower]

        return {
            "repo_id": repo_id,
            "category_filter": category,
            "issues": issues,
            "count": len(issues),
        }
    except httpx.HTTPStatusError as exc:
        return {"error": f"HTTP {exc.response.status_code}: {exc.response.text}", "repo_id": repo_id}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {exc}", "repo_id": repo_id}


@mcp.tool()
async def get_leaderboard(repo_id: str, time_range: str = "30d") -> dict:
    """Get team leaderboard rankings: best quality, most improved, most security-conscious."""
    try:
        data = await _get("/api/leaderboard", params={"repoId": repo_id, "timeRange": time_range})
        leaderboard = data if isinstance(data, dict) else {}
        return {
            "repo_id": repo_id,
            "timeRange": time_range,
            "bestQuality": leaderboard.get("bestQuality", []),
            "mostImproved": leaderboard.get("mostImproved", []),
            "mostSecurityConscious": leaderboard.get("mostSecurityConscious", []),
            "rankings": leaderboard.get("rankings", leaderboard.get("data", [])),
        }
    except httpx.HTTPStatusError as exc:
        return {"error": f"HTTP {exc.response.status_code}: {exc.response.text}", "repo_id": repo_id}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {exc}", "repo_id": repo_id}


@mcp.tool()
async def get_release_notes(repo_id: str, limit: int = 10) -> dict:
    """Get AI-generated release notes for merged PRs in a repository."""
    try:
        data = await _get(f"/api/releasenotes/{repo_id}", params={"limit": limit})
        notes = data if isinstance(data, dict) else {}
        entries = notes.get("releaseNotes", notes.get("notes", notes.get("data", [])))
        if isinstance(entries, list):
            entries = entries[:limit]
        return {
            "repo_id": repo_id,
            "releaseNotes": entries,
            "count": len(entries) if isinstance(entries, list) else 0,
        }
    except httpx.HTTPStatusError as exc:
        return {"error": f"HTTP {exc.response.status_code}: {exc.response.text}", "repo_id": repo_id}
    except httpx.RequestError as exc:
        return {"error": f"Request failed: {exc}", "repo_id": repo_id}


def main():
    mcp.run()


if __name__ == "__main__":
    main()
