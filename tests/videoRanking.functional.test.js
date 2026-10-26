import assert from "node:assert";
import { calculateVideoScore, getRankedVideos } from "../core-modules/videoRanking.js";

export function runVideoFunctionalTests() {
  const results = [];

  try {
    const freshVideo = {
      createdAt: new Date().toISOString(),
      views: 100,
      likesCount: 20,
      commentsCount: 5,
      totalWatchTime: 6000,
      duration: 60
    };
    const score = calculateVideoScore(freshVideo);
    assert(score > 0, "Score should be positive");
    assert(typeof score === "number", "Score should be a number");
    results.push({ name: "Calculate basic video engagement score", status: "PASS" });
  } catch (error) {
    results.push({ name: "Calculate basic video engagement score", status: "FAIL", error: error.message });
  }

  try {
    const now = Date.now();
    const newVideo = {
      createdAt: new Date(now).toISOString(),
      views: 500,
      likesCount: 50,
      commentsCount: 10,
      duration: 120
    };
    const oldVideo = {
      createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(),
      views: 500,
      likesCount: 50,
      commentsCount: 10,
      duration: 120
    };
    const newScore = calculateVideoScore(newVideo);
    const oldScore = calculateVideoScore(oldVideo);
    assert(newScore > oldScore, "Newer video must score higher than older video");
    results.push({ name: "Apply exponential recency decay", status: "PASS" });
  } catch (error) {
    results.push({ name: "Apply exponential recency decay", status: "FAIL", error: error.message });
  }

  try {
    const base = {
      createdAt: new Date().toISOString(),
      views: 100,
      likesCount: 10,
      commentsCount: 2,
      duration: 60
    };
    const highRetention = { ...base, totalWatchTime: 6000 };
    const lowRetention = { ...base, totalWatchTime: 600 };
    const highScore = calculateVideoScore(highRetention);
    const lowScore = calculateVideoScore(lowRetention);
    assert(highScore > lowScore, "High watch time must produce higher score than low watch time");
    results.push({ name: "Reward audience watch retention ratio", status: "PASS" });
  } catch (error) {
    results.push({ name: "Reward audience watch retention ratio", status: "FAIL", error: error.message });
  }

  try {
    const videos = [
      { id: "v1", createdAt: new Date().toISOString(), views: 10, likesCount: 1, commentsCount: 0 },
      { id: "v2", createdAt: new Date().toISOString(), views: 1000, likesCount: 200, commentsCount: 50 },
      { id: "v3", createdAt: new Date().toISOString(), views: 100, likesCount: 20, commentsCount: 5 }
    ];
    const ranked = getRankedVideos(videos);
    assert.strictEqual(ranked[0].id, "v2", "Top video should have highest engagement");
    assert.strictEqual(ranked[1].id, "v3", "Second video should be v3");
    assert.strictEqual(ranked[2].id, "v1", "Third video should be v1");
    assert(ranked[0].rankingScore >= ranked[1].rankingScore, "Scores must be descending");
    assert(ranked[1].rankingScore >= ranked[2].rankingScore, "Scores must be descending");
    results.push({ name: "Sort candidates in descending score order", status: "PASS" });
  } catch (error) {
    results.push({ name: "Sort candidates in descending score order", status: "FAIL", error: error.message });
  }

  try {
    const incompleteVideo = {
      createdAt: new Date().toISOString()
    };
    const score = calculateVideoScore(incompleteVideo);
    assert(!isNaN(score), "Score must not be NaN");
    assert(score >= 0, "Score must be non-negative");
    results.push({ name: "Default missing optional fields safely", status: "PASS" });
  } catch (error) {
    results.push({ name: "Default missing optional fields safely", status: "FAIL", error: error.message });
  }

  return results;
}

if (process.argv[1].endsWith("videoRanking.functional.test.js")) {
  const tests = runVideoFunctionalTests();
  console.log("=== Video Ranking Functional Tests ===");
  tests.forEach((t) => console.log(`[${t.status}] ${t.name}${t.error ? ": " + t.error : ""}`));
}
