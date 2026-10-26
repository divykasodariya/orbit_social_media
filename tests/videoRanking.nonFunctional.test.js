import assert from "node:assert";
import { calculateVideoScore, getRankedVideos } from "../core-modules/videoRanking.js";

export function runVideoNonFunctionalTests() {
  const results = [];

  try {
    const sampleVideos = Array.from({ length: 1000 }, (_, i) => ({
      id: `vid_${i}`,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      views: (i * 17) % 5000,
      likesCount: (i * 3) % 800,
      commentsCount: (i * 2) % 150,
      totalWatchTime: i * 50,
      duration: 60
    }));

    const start = performance.now();
    for (let i = 0; i < sampleVideos.length; i++) {
      calculateVideoScore(sampleVideos[i]);
    }
    const elapsedMs = performance.now() - start;

    assert(elapsedMs < 30, `1000 calculations should take < 30ms, took ${elapsedMs.toFixed(2)}ms`);
    results.push({
      name: "Latency test for 1,000 video calculations",
      status: "PASS",
      metric: `${elapsedMs.toFixed(2)} ms`
    });
  } catch (error) {
    results.push({
      name: "Latency test for 1,000 video calculations",
      status: "FAIL",
      error: error.message
    });
  }

  try {
    const video = {
      createdAt: new Date().toISOString(),
      views: 1200,
      likesCount: 150,
      commentsCount: 30,
      duration: 180
    };

    const iterations = 50000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      calculateVideoScore(video);
    }
    const totalTimeSec = (performance.now() - start) / 1000;
    const opsPerSec = Math.round(iterations / totalTimeSec);

    assert(opsPerSec > 50000, `Throughput should exceed 50k ops/sec, got ${opsPerSec} ops/sec`);
    results.push({
      name: "Throughput test for high-volume scoring",
      status: "PASS",
      metric: `${opsPerSec.toLocaleString()} ops/sec`
    });
  } catch (error) {
    results.push({
      name: "Throughput test for high-volume scoring",
      status: "FAIL",
      error: error.message
    });
  }

  try {
    const memoryBefore = process.memoryUsage().heapUsed;
    const largeBatch = Array.from({ length: 50000 }, (_, i) => ({
      id: `batch_${i}`,
      createdAt: new Date(Date.now() - (i % 30) * 86400000).toISOString(),
      views: (i % 1000) * 10,
      likesCount: i % 200,
      commentsCount: i % 50
    }));

    const start = performance.now();
    const ranked = getRankedVideos(largeBatch);
    const durationMs = performance.now() - start;
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDiffMb = ((memoryAfter - memoryBefore) / (1024 * 1024)).toFixed(2);

    assert.strictEqual(ranked.length, 50000, "All 50,000 items must be sorted");
    assert(durationMs < 1000, `Sorting 50k items should take < 1s, took ${durationMs.toFixed(2)}ms`);
    results.push({
      name: "Stress and memory test on 50,000 candidate batch",
      status: "PASS",
      metric: `${durationMs.toFixed(2)} ms (Heap: ${memoryDiffMb} MB)`
    });
  } catch (error) {
    results.push({
      name: "Stress and memory test on 50,000 candidate batch",
      status: "FAIL",
      error: error.message
    });
  }

  try {
    const malformedInputs = [
      {},
      { views: null, likesCount: undefined },
      { createdAt: "invalid-date-string" },
      { createdAt: new Date(Date.now() + 10000000).toISOString(), views: -50 },
      { views: 0, duration: 0, totalWatchTime: 0 }
    ];

    for (const item of malformedInputs) {
      const score = calculateVideoScore(item);
      assert(typeof score === "number", "Should safely return a number");
    }
    const emptyRank = getRankedVideos([]);
    assert.strictEqual(emptyRank.length, 0, "Empty list returns empty array");

    results.push({
      name: "Fault tolerance with malformed inputs",
      status: "PASS",
      metric: "Handled 6 edge cases safely"
    });
  } catch (error) {
    results.push({
      name: "Fault tolerance with malformed inputs",
      status: "FAIL",
      error: error.message
    });
  }

  return results;
}

if (process.argv[1].endsWith("videoRanking.nonFunctional.test.js")) {
  const tests = runVideoNonFunctionalTests();
  console.log("=== Video Ranking Non-Functional Tests ===");
  tests.forEach((t) => console.log(`[${t.status}] ${t.name}: ${t.metric || t.error}`));
}
