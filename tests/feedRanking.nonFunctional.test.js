import assert from "node:assert";
import { scoreFeedItem, rankFeedCandidates } from "../core-modules/feedRanking.js";

export function runFeedNonFunctionalTests() {
  const results = [];

  try {
    const affinity = {
      friendId: "friend_target",
      joinedCommunityIds: ["comm_1", "comm_2", "comm_3"]
    };
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: `item_${i}`,
      createdAt: new Date(Date.now() - i * 1800000).toISOString(),
      authorId: i % 10 === 0 ? "friend_target" : `user_${i}`,
      communityId: `comm_${i % 5}`,
      likesCount: (i * 7) % 500,
      commentsCount: (i * 2) % 100,
      sharesCount: i % 20
    }));

    const start = performance.now();
    for (let i = 0; i < items.length; i++) {
      scoreFeedItem(items[i], affinity);
    }
    const elapsedMs = performance.now() - start;

    assert(elapsedMs < 30, `1000 feed calculations should take < 30ms, took ${elapsedMs.toFixed(2)}ms`);
    results.push({
      name: "Latency test for 1,000 feed calculations",
      status: "PASS",
      metric: `${elapsedMs.toFixed(2)} ms`
    });
  } catch (error) {
    results.push({
      name: "Latency test for 1,000 feed calculations",
      status: "FAIL",
      error: error.message
    });
  }

  try {
    const item = {
      createdAt: new Date().toISOString(),
      authorId: "user_speed",
      communityId: "comm_fast",
      likesCount: 50,
      commentsCount: 15,
      sharesCount: 5
    };
    const affinity = {
      friendId: "user_speed",
      joinedCommunityIds: ["comm_fast"]
    };

    const iterations = 50000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      scoreFeedItem(item, affinity);
    }
    const totalTimeSec = (performance.now() - start) / 1000;
    const opsPerSec = Math.round(iterations / totalTimeSec);

    assert(opsPerSec > 50000, `Throughput should exceed 50k ops/sec, got ${opsPerSec} ops/sec`);
    results.push({
      name: "Throughput test for high-volume feed scoring",
      status: "PASS",
      metric: `${opsPerSec.toLocaleString()} ops/sec`
    });
  } catch (error) {
    results.push({
      name: "Throughput test for high-volume feed scoring",
      status: "FAIL",
      error: error.message
    });
  }

  try {
    const memoryBefore = process.memoryUsage().heapUsed;
    const affinity = {
      friendId: "friend_cluster",
      joinedCommunityIds: ["c1", "c2", "c3"]
    };
    const largeFeed = Array.from({ length: 50000 }, (_, i) => ({
      id: `post_${i}`,
      createdAt: new Date(Date.now() - (i % 48) * 3600000).toISOString(),
      authorId: i % 25 === 0 ? "friend_cluster" : `author_${i}`,
      communityId: `c${i % 10}`,
      likesCount: (i * 3) % 200,
      commentsCount: i % 50,
      sharesCount: i % 10
    }));

    const start = performance.now();
    const ranked = rankFeedCandidates(largeFeed, affinity);
    const durationMs = performance.now() - start;
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDiffMb = ((memoryAfter - memoryBefore) / (1024 * 1024)).toFixed(2);

    assert.strictEqual(ranked.length, 50000, "All 50,000 feed candidates must be ranked");
    assert(durationMs < 1000, `Ranking 50k items should take < 1s, took ${durationMs.toFixed(2)}ms`);
    results.push({
      name: "Stress and memory test on 50,000 feed items",
      status: "PASS",
      metric: `${durationMs.toFixed(2)} ms (Heap: ${memoryDiffMb} MB)`
    });
  } catch (error) {
    results.push({
      name: "Stress and memory test on 50,000 feed items",
      status: "FAIL",
      error: error.message
    });
  }

  try {
    const nowIso = new Date().toISOString();
    const edgeCases = [
      { item: { createdAt: nowIso }, affinity: {} },
      { item: { createdAt: nowIso, likesCount: null }, affinity: { friendId: null } },
      { item: { createdAt: nowIso, commentsCount: undefined }, affinity: { joinedCommunityIds: null } },
      { item: { createdAt: nowIso, likesCount: 0, commentsCount: 0 }, affinity: { joinedCommunityIds: [] } },
      { item: { createdAt: nowIso, authorId: null, communityId: null }, affinity: { friendId: "user_1" } }
    ];

    for (const testCase of edgeCases) {
      const score = scoreFeedItem(testCase.item, testCase.affinity);
      assert(typeof score === "number", "Score must be a number");
      assert(!isNaN(score), "Score must not be NaN");
    }

    const emptyResult = rankFeedCandidates([], { friendId: "x", joinedCommunityIds: [] });
    assert.strictEqual(emptyResult.length, 0, "Empty list should return empty array");

    results.push({
      name: "Fault tolerance with null and missing affinity properties",
      status: "PASS",
      metric: "Handled 6 edge cases safely"
    });
  } catch (error) {
    results.push({
      name: "Fault tolerance with null and missing affinity properties",
      status: "FAIL",
      error: error.message
    });
  }

  return results;
}

if (process.argv[1].endsWith("feedRanking.nonFunctional.test.js")) {
  const tests = runFeedNonFunctionalTests();
  console.log("=== Feed Ranking Non-Functional Tests ===");
  tests.forEach((t) => console.log(`[${t.status}] ${t.name}: ${t.metric || t.error}`));
}
