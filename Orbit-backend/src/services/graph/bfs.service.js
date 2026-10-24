import { readQuery } from "./neo4j.service.js";

/**
 * Perform a Breadth-First Search (BFS) to find the shortest connection path between two users.
 * Uses the FRIEND relationship.
 * 
 * @param {string} startUserId
 * @param {string} targetUserId
 * @param {number} maxDepth - Default 6
 */
export const findShortestPathBfs = async (startUserId, targetUserId, maxDepth = 6) => {
    // Cypher's shortestPath algorithm uses BFS natively with visited-node tracking.
    const cypher = `
        MATCH (start:User {mongoId: $startUserId})
        MATCH (end:User {mongoId: $targetUserId})
        MATCH p = shortestPath((start)-[:FRIEND*1..${maxDepth}]-(end))
        RETURN [x IN nodes(p) | x.mongoId] AS path
    `;
    
    const result = await readQuery(cypher, { 
        startUserId: startUserId.toString(),
        targetUserId: targetUserId.toString()
    });
    
    if (result && result.length > 0) {
        return result[0].get('path');
    }
    return null;
};
