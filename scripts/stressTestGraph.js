import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config({ path: "./Orbit-backend/.env" });

const driver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  ),
  { maxConnectionPoolSize: 100 }
);

async function getMutualFriends(userId1, userId2) {
  const session = driver.session();
  try {
    const query = `
      MATCH (u1:User {id: $userId1})-[:FRIEND_WITH]-(mutual:User)-[:FRIEND_WITH]-(u2:User {id: $userId2})
      RETURN mutual.id AS id, mutual.name AS name, mutual.avatar AS avatar
    `;
    const result = await session.run(query, { userId1, userId2 });
    return result.records.map((record) => ({
      id: record.get("id"),
      name: record.get("name"),
      avatar: record.get("avatar"),
    }));
  } finally {
    await session.close();
  }
}

async function getSecondDegreeRecommendations(userId, limit = 10) {
  const session = driver.session();
  try {
    const query = `
      MATCH (me:User {id: $userId})-[:FRIEND_WITH]->(f:User)-[:FRIEND_WITH]->(suggested:User)
      WHERE NOT (me)-[:FRIEND_WITH]->(suggested) AND me <> suggested
      RETURN suggested.id AS id, suggested.name AS name, count(f) AS mutualCount
      ORDER BY mutualCount DESC
      LIMIT $limit
    `;
    const result = await session.run(query, { userId, limit: neo4j.int(limit) });
    return result.records.map((r) => ({
      id: r.get("id"),
      name: r.get("name"),
      mutualCount: r.get("mutualCount").toNumber ? r.get("mutualCount").toNumber() : Number(r.get("mutualCount")),
    }));
  } finally {
    await session.close();
  }
}

async function runBenchmark(name, testFn, concurrency = 50, totalRequests = 500) {
  console.log(`\n======================================================`);
  console.log(`🚀 Benchmarking: ${name}`);
  console.log(`⚙️  Concurrency: ${concurrency} workers | Total: ${totalRequests} requests`);
  console.log(`======================================================`);

  const latencies = [];
  let completed = 0;
  let errors = 0;
  let reqIndex = 0;
  const start = performance.now();

  async function worker() {
    while (reqIndex < totalRequests) {
      reqIndex++;
      const t0 = performance.now();
      try {
        await testFn();
        latencies.push(performance.now() - t0);
      } catch (err) {
        errors++;
      }
      completed++;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const durationSec = (performance.now() - start) / 1000;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length) || 0;
  const qps = (completed / durationSec).toFixed(1);

  console.log(`⏱️  Total Duration:      ${durationSec.toFixed(2)} seconds`);
  console.log(`⚡ Throughput:          ${qps} req/sec`);
  console.log(`📊 Avg Latency:         ${avg.toFixed(2)} ms`);
  console.log(`📊 P50 Latency:         ${p50.toFixed(2)} ms`);
  console.log(`📊 P95 Latency:         ${p95.toFixed(2)} ms`);
  console.log(`📊 P99 Latency:         ${p99.toFixed(2)} ms`);
  console.log(`❌ Error Count:         ${errors} / ${totalRequests}`);
}

async function main() {
  const session = driver.session();
  const sampleUsers = await session.run("MATCH (u:User) RETURN u.id AS id LIMIT 2");
  await session.close();

  if (sampleUsers.records.length < 2) {
    console.error("Not enough users in Neo4j. Run 'npm run sync:neo4j' first!");
    process.exit(1);
  }

  const u1 = sampleUsers.records[0].get("id");
  const u2 = sampleUsers.records[1].get("id");

  await runBenchmark("getMutualFriends", () => getMutualFriends(u1, u2), 50, 400);
  await runBenchmark("getSecondDegreeRecommendations", () => getSecondDegreeRecommendations(u1, 10), 50, 400);

  await driver.close();
}

main().catch(console.error);
