import { readQuery } from "./neo4j.service.js";

/**
 * Return the top 20 mutual connections between two users.
 */
export const getMutualConnections = async (user1Id, user2Id, limit = 20) => {
    const cypher = `
        MATCH (u1:User {mongoId: $user1Id})-[:FRIEND]-(mutual:User)-[:FRIEND]-(u2:User {mongoId: $user2Id})
        RETURN mutual.mongoId AS mutualId, count(mutual) as weight
        ORDER BY weight DESC
        LIMIT toInteger($limit)
    `;
    
    const result = await readQuery(cypher, { 
        user1Id: user1Id.toString(), 
        user2Id: user2Id.toString(),
        limit: parseInt(limit, 10)
    });

    if (result && result.length > 0) {
        return result.map(record => record.get('mutualId'));
    }
    return [];
};
