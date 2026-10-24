import { getDriver } from '../../config/neo4j.config.js';

/**
 * Execute a Cypher query using a Read session.
 */
export const readQuery = async (cypher, params = {}) => {
    const driver = getDriver();
    if (!driver) return null;
    
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });
    try {
        const result = await session.run(cypher, params);
        return result.records;
    } catch (error) {
        console.error('Neo4j Read Error:', error);
        throw error;
    } finally {
        await session.close();
    }
};

/**
 * Execute a Cypher query using a Write session.
 */
export const writeQuery = async (cypher, params = {}) => {
    const driver = getDriver();
    if (!driver) return null;
    
    const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
    try {
        const result = await session.run(cypher, params);
        return result.records;
    } catch (error) {
        console.error('Neo4j Write Error:', error);
        throw error;
    } finally {
        await session.close();
    }
};

/**
 * Execute multiple queries in a transaction
 */
export const executeTransaction = async (queries) => {
    const driver = getDriver();
    if (!driver) return null;

    const session = driver.session();
    const tx = session.beginTransaction();
    
    try {
        const results = [];
        for (const q of queries) {
            const result = await tx.run(q.cypher, q.params || {});
            results.push(result.records);
        }
        await tx.commit();
        return results;
    } catch (error) {
        await tx.rollback();
        console.error('Neo4j Transaction Error:', error);
        throw error;
    } finally {
        await session.close();
    }
};

/**
 * Setup unique constraints and indexes for the graph database.
 */
export const setupConstraints = async () => {
    const constraints = [
        'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.mongoId IS UNIQUE',
        'CREATE CONSTRAINT community_id_unique IF NOT EXISTS FOR (c:Community) REQUIRE c.mongoId IS UNIQUE'
    ];

    console.log('Setting up Neo4j constraints...');
    for (const query of constraints) {
        try {
            await writeQuery(query);
        } catch (error) {
            console.error(`Failed to setup constraint: ${query}`, error);
        }
    }
    console.log('Neo4j constraints setup completed.');
};

/**
 * Basic health check
 */
export const checkHealth = async () => {
    try {
        const result = await readQuery('RETURN 1 AS ok');
        return result && result[0].get('ok') === 1;
    } catch (error) {
        return false;
    }
};

// Also import neo4j for accessMode in the functions above
import neo4j from 'neo4j-driver';
