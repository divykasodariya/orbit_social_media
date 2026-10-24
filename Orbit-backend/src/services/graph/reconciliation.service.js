import { User } from '../../models/user.model.js';
import { Subscription } from '../../models/subscription.model.js';
import { createUserNode } from './userGraph.service.js';
import { followUser } from './relationshipGraph.service.js';
import fs from 'fs';
import path from 'path';

/**
 * Log synchronization failures for retry.
 */
export const logSyncFailure = (operation, payload, error) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        operation,
        payload,
        error: error.message
    };
    
    console.error('Graph Sync Failure:', logEntry);
    
    // Simple file-based DLQ (Dead Letter Queue)
    try {
        const logPath = path.join(process.cwd(), 'graph-sync-failures.log');
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    } catch (fsError) {
        console.error('Failed to write to sync failure log', fsError);
    }
};

/**
 * Reconcile Users: Ensures all MongoDB users exist as nodes in Neo4j.
 * This should be run as a cron job or startup check.
 */
export const reconcileUsers = async () => {
    console.log('Starting User reconciliation...');
    try {
        const users = await User.find({}).select('_id username');
        let created = 0;
        
        for (const user of users) {
            try {
                await createUserNode(user._id, user.username);
                created++;
            } catch (err) {
                logSyncFailure('createUserNode', { userId: user._id, username: user.username }, err);
            }
        }
        console.log(`User reconciliation complete. Synced ${created}/${users.length} users.`);
    } catch (error) {
        console.error('User reconciliation failed:', error);
    }
};

/**
 * Reconcile Follows: Ensures all MongoDB subscriptions exist as FOLLOWS in Neo4j.
 */
export const reconcileFollows = async () => {
    console.log('Starting Follows reconciliation...');
    try {
        const subscriptions = await Subscription.find({});
        let synced = 0;
        
        for (const sub of subscriptions) {
            try {
                await followUser(sub.subscriber, sub.channel);
                synced++;
            } catch (err) {
                logSyncFailure('followUser', { followerId: sub.subscriber, followeeId: sub.channel }, err);
            }
        }
        console.log(`Follows reconciliation complete. Synced ${synced}/${subscriptions.length} relationships.`);
    } catch (error) {
        console.error('Follows reconciliation failed:', error);
    }
};

/**
 * Run a full graph synchronization.
 */
export const fullReconciliation = async () => {
    await reconcileUsers();
    await reconcileFollows();
    console.log('Full graph reconciliation finished.');
};
