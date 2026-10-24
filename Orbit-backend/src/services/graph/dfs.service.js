import { readQuery } from "./neo4j.service.js";

/**
 * Perform a Depth-First Search (DFS) bounded graph traversal.
 * Cypher path matching natively handles visited-node tracking and cycle prevention within a single path.
 * 
 * @param {string} startUserId 
 * @param {number} maxDepth - Default 6
 */
export const traverseGraphDfs = async (startUserId, maxDepth = 6) => {
    // Using simple pattern matching to get paths up to maxDepth.
    // Note: DFS in Cypher can blow up combinatorially. We limit the returned paths for sanity.
    const cypher = `
        MATCH p = (start:User {mongoId: $startUserId})-[:FRIEND*1..${maxDepth}]-(end:User)
        RETURN [x IN nodes(p) | x.mongoId] AS path
        LIMIT 100
    `;
    
    const result = await readQuery(cypher, { 
        startUserId: startUserId.toString()
    });
    
    if (result && result.length > 0) {
        return result.map(record => record.get('path'));
    }
    return [];
};
