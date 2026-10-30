import { writeQuery, readQuery } from './neo4j.service.js';

/**
 * Create a new user node in the graph.
 * @param {string} mongoId - The MongoDB user ID.
 * @param {string} username - The username.
 */
export const createUserNode = async (mongoId, username) => {
    try{
        const cypher = `
        MERGE (u:User {mongoId: $mongoId})
        ON CREATE SET u.username = $username, u.createdAt = datetime()
        ON MATCH SET u.username = $username
        RETURN u
    `;
    const result = await writeQuery(cypher, { mongoId: mongoId.toString(), username });
    return result ? result[0].get('u').properties : null;
    }catch(error){
        console.error("❌ Error creating user node:", error);
        throw error;
    }
};

/**
 * Delete a user node and all its relationships.
 */
export const deleteUserNode = async (mongoId) => {
    const cypher = `
        MATCH (u:User {mongoId: $mongoId})
        DETACH DELETE u
    `;
    await writeQuery(cypher, { mongoId: mongoId.toString() });
    return true;
};

/**
 * Get a user node by MongoDB ID.
 */
export const getUserNode = async (mongoId) => {
    const cypher = `
        MATCH (u:User {mongoId: $mongoId})
        RETURN u
    `;
    const result = await readQuery(cypher, { mongoId: mongoId.toString() });
    return result && result.length > 0 ? result[0].get('u').properties : null;
};
