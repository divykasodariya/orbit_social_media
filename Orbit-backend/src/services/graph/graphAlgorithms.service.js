import { readQuery } from './neo4j.service.js';

/**
 * Perform a Breadth-First Search (BFS) to find the shortest connection path between two users.
 * Uses the FRIEND relationship. Max configurable depth (default 6).
 */
export const findShortestPathBfs = async (startUserId, targetUserId, maxDepth = 6) => {
    // Cypher's shortestPath algorithm uses BFS internally.
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

/**
 * Perform a Depth-First Search (DFS) to find paths between two users.
 * Cycle prevention and visited node tracking are handled by Cypher pattern matching.
 */
export const findPathsDfs = async (startUserId, targetUserId, maxDepth = 6) => {
    // Cypher's standard pattern matching without shortestPath does DFS-like expansion.
    // We limit depth and return all paths.
    const cypher = `
        MATCH p = (start:User {mongoId: $startUserId})-[:FRIEND*1..${maxDepth}]-(end:User {mongoId: $targetUserId})
        RETURN [x IN nodes(p) | x.mongoId] AS path
    `;
    
    const result = await readQuery(cypher, { 
        startUserId: startUserId.toString(),
        targetUserId: targetUserId.toString()
    });
    
    if (result && result.length > 0) {
        return result.map(record => record.get('path'));
    }
    return [];
};
