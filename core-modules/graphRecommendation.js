import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  ),
  {
    disableLosslessIntegers: true, // Returns JS numbers directly, no .toNumber() needed
  }
);

/**
 * Get mutual friends between two users.
 * Uses undirected FRIEND_WITH to work regardless of who sent the friend request.
 */
export async function getMutualFriends(userId1, userId2) {
  const session = driver.session();
  try {
    const query = `
      MATCH (u1:User {id: $userId1})-[:FRIEND_WITH]-(mutual:User)-[:FRIEND_WITH]-(u2:User {id: $userId2})
      WHERE mutual.id <> $userId1 AND mutual.id <> $userId2
      RETURN DISTINCT mutual.id AS id, mutual.name AS name, mutual.avatar AS avatar
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

/**
 * Get second-degree friend recommendations.
 * Uses undirected FRIEND_WITH so that both sender and receiver edges are traversed.
 * Excludes existing friends and the user themselves.
 */
export async function getSecondDegreeRecommendations(userId, limit = 10) {
  const session = driver.session();
  try {
    const query = `
      MATCH (me:User {id: $userId})-[:FRIEND_WITH]-(f:User)-[:FRIEND_WITH]-(suggested:User)
      WHERE me <> suggested AND NOT (me)-[:FRIEND_WITH]-(suggested)
      RETURN DISTINCT suggested.id AS id, suggested.name AS name, count(DISTINCT f) AS mutualCount
      ORDER BY mutualCount DESC
      LIMIT $limit
    `;
    const result = await session.run(query, { userId, limit: neo4j.int(limit) });
    return result.records.map((r) => ({
      id: r.get("id"),
      name: r.get("name"),
      mutualCount: typeof r.get("mutualCount") === "object"
        ? r.get("mutualCount").toNumber()
        : Number(r.get("mutualCount")),
    }));
  } finally {
    await session.close();
  }
}
