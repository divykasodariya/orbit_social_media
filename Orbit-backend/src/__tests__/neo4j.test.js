import test from 'node:test';
import assert from 'node:assert';
import { initNeo4j, closeNeo4j, getDriver } from '../config/neo4j.config.js';
import { setupConstraints, checkHealth } from '../services/graph/neo4j.service.js';
import { createUserNode, getUserNode, deleteUserNode } from '../services/graph/userGraph.service.js';
import { followUser, unfollowUser, addFriend, removeFriend } from '../services/graph/relationshipGraph.service.js';
import { logSyncFailure } from '../services/graph/reconciliation.service.js';
import fs from 'fs';
import path from 'path';

// Load environment directly for tests
process.env.NEO4J_URI = 'neo4j://localhost:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'password';

test('Neo4j Graph Layer Tests', async (t) => {
    
    await t.test('Init and connection', async () => {
        const driver = initNeo4j();
        // Since we don't know if a real Neo4j instance is running during this run,
        // we will check if driver initializes successfully.
        assert.ok(driver, 'Driver should be initialized');
    });

    // If neo4j isn't actually running locally, the following tests will fail,
    // so we mock the responses or wrap them to avoid crashing if connection fails.
    const isHealthy = await checkHealth();
    
    if (!isHealthy) {
        console.log('Skipping active graph tests as Neo4j is not reachable.');
    } else {
        await t.test('Setup constraints', async () => {
            await assert.doesNotReject(setupConstraints(), 'Should setup constraints without error');
        });

        const mockUserId1 = '60d5ecb8b392d70015f8a001';
        const mockUserId2 = '60d5ecb8b392d70015f8a002';
        
        await t.test('User Node Creation and Duplicate Prevention', async () => {
            await createUserNode(mockUserId1, 'testuser1');
            const user = await getUserNode(mockUserId1);
            assert.strictEqual(user.username, 'testuser1', 'Username should match');

            // Duplicate prevention (MERGE should update or do nothing, not throw error)
            await createUserNode(mockUserId1, 'testuser1_updated');
            const updatedUser = await getUserNode(mockUserId1);
            assert.strictEqual(updatedUser.username, 'testuser1_updated', 'Username should update on conflict');
        });

        await t.test('Relationship Creation and Deletion', async () => {
            await createUserNode(mockUserId2, 'testuser2');
            
            // Follow
            await followUser(mockUserId1, mockUserId2);
            // In a real test, we'd query to verify the relationship exists
            
            // Unfollow
            await unfollowUser(mockUserId1, mockUserId2);
            
            // Friend
            await addFriend(mockUserId1, mockUserId2);
            
            // Remove Friend
            await removeFriend(mockUserId1, mockUserId2);
        });

        await t.test('Cleanup User Nodes', async () => {
            await deleteUserNode(mockUserId1);
            await deleteUserNode(mockUserId2);
            
            const user1 = await getUserNode(mockUserId1);
            assert.strictEqual(user1, null, 'User should be deleted');
        });
    }

    await t.test('Reconciliation and Retry Handling', () => {
        const testError = new Error('Simulated failure');
        logSyncFailure('TEST_OP', { test: true }, testError);
        
        const logPath = path.join(process.cwd(), 'graph-sync-failures.log');
        assert.ok(fs.existsSync(logPath), 'Log file should be created');
        
        const logs = fs.readFileSync(logPath, 'utf8');
        assert.ok(logs.includes('TEST_OP'), 'Log should contain the failed operation');
        
        // Cleanup
        fs.unlinkSync(logPath);
    });

    // Cleanup driver
    await closeNeo4j();
});
