import { readQuery } from "../graph/neo4j.service.js";

/**
 * Recommend communities based on graph relationship overlap.
 * (Communities joined by your friends).
 */
export const recommendCommunities = async (userId, limit = 10) => {
    // Cypher query to find communities joined by friends, 
    // excluding communities the user has already joined.
    // Rank by the number of friends in that community.
    const cypher = `
        MATCH (u:User {mongoId: $userId})-[:FRIEND]-(friend:User)-[:MEMBER_OF]->(c:Community)
        WHERE NOT (u)-[:MEMBER_OF]->(c)
        RETURN c.mongoId AS communityId, count(friend) AS friendCount
        ORDER BY friendCount DESC
        LIMIT toInteger($limit)
    `;

    const result = await readQuery(cypher, { 
        userId: userId.toString(),
        limit: parseInt(limit, 10)
    });

    if (!result || result.length === 0) return [];

    return result.map(record => ({
        communityId: record.get('communityId'),
        friendCount: record.get('friendCount').low || record.get('friendCount'),
        reason: `${record.get('friendCount').low || record.get('friendCount')} friends joined this community`
    }));
};
