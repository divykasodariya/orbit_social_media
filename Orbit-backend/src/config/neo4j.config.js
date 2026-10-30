import neo4j from 'neo4j-driver';

let driver;

export const initNeo4j = () => {
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
        console.warn('Neo4j environment variables missing. Graph capabilities will be disabled.');
        return null;
    }

    try {
        driver = neo4j.driver(
            process.env.NEO4J_URI,
            neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
            {
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
                disableLosslessIntegers: true, // Use standard JS numbers instead of Neo4j Integer objects
                // encrypted: 'ENCRYPTION_OFF', // Fix for Neo4j 4.0+ local unencrypted connections
            }
        );
        console.log('✅ Neo4j Driver Initialized');
        return driver;
    } catch (error) {
        console.error('❌ Neo4j Driver Initialization Failed:', error);
        throw error;
    }
};

export const getDriver = () => {
    if (!driver) {
        return initNeo4j();
    }
    return driver;
};

export const closeNeo4j = async () => {
    if (driver) {
        await driver.close();
        console.log('✅ Neo4j Driver Closed');
    }
};
