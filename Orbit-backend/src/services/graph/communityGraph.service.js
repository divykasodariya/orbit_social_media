import { writeQuery } from './neo4j.service.js';

/**
 * Create a new community node in the graph.
 */
export const createCommunityNode = async (mongoId) => {
    const cypher = `
        MERGE (c:Community {mongoId: $mongoId})
        ON CREATE SET c.createdAt = datetime()
        RETURN c
    `;
    const result = await writeQuery(cypher, { mongoId: mongoId.toString() });
    return result ? result[0].get('c').properties : null;
};

/**
 * Delete a community node and all its relationships.
 */
export const deleteCommunityNode = async (mongoId) => {
    const cypher = `
        MATCH (c:Community {mongoId: $mongoId})
        DETACH DELETE c
    `;
    await writeQuery(cypher, { mongoId: mongoId.toString() });
    return true;
};
