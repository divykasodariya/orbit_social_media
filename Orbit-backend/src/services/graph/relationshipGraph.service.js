import { writeQuery, readQuery } from './neo4j.service.js';

// --- FOLLOWS ---

export const followUser = async (followerId, followeeId) => {
    const cypher = `
        MATCH (follower:User {mongoId: $followerId})
        MATCH (followee:User {mongoId: $followeeId})
        MERGE (follower)-[r:FOLLOWS]->(followee)
        ON CREATE SET r.createdAt = datetime()
        RETURN r
    `;
    const result = await writeQuery(cypher, { 
        followerId: followerId.toString(), 
        followeeId: followeeId.toString() 
    });
    return result ? true : false;
};

export const unfollowUser = async (followerId, followeeId) => {
    const cypher = `
        MATCH (follower:User {mongoId: $followerId})-[r:FOLLOWS]->(followee:User {mongoId: $followeeId})
        DELETE r
    `;
    await writeQuery(cypher, { 
        followerId: followerId.toString(), 
        followeeId: followeeId.toString() 
    });
    return true;
};

// --- FRIEND ---

export const addFriend = async (userId1, userId2) => {
    const cypher = `
        MATCH (u1:User {mongoId: $userId1})
        MATCH (u2:User {mongoId: $userId2})
        MERGE (u1)-[r1:FRIEND]->(u2)
        ON CREATE SET r1.createdAt = datetime()
        MERGE (u2)-[r2:FRIEND]->(u1)
        ON CREATE SET r2.createdAt = datetime()
        RETURN r1, r2
    `;
    const result = await writeQuery(cypher, { 
        userId1: userId1.toString(), 
        userId2: userId2.toString() 
    });
    return result ? true : false;
};

export const removeFriend = async (userId1, userId2) => {
    const cypher = `
        MATCH (u1:User {mongoId: $userId1})-[r:FRIEND]-(u2:User {mongoId: $userId2})
        DELETE r
    `;
    await writeQuery(cypher, { 
        userId1: userId1.toString(), 
        userId2: userId2.toString() 
    });
    return true;
};

// --- MEMBER_OF (Community) ---

export const joinCommunity = async (userId, communityId) => {
    const cypher = `
        MATCH (u:User {mongoId: $userId})
        MERGE (c:Community {mongoId: $communityId})
        MERGE (u)-[r:MEMBER_OF]->(c)
        ON CREATE SET r.joinedAt = datetime()
        RETURN r
    `;
    await writeQuery(cypher, { 
        userId: userId.toString(), 
        communityId: communityId.toString() 
    });
    return true;
};

export const leaveCommunity = async (userId, communityId) => {
    const cypher = `
        MATCH (u:User {mongoId: $userId})-[r:MEMBER_OF]->(c:Community {mongoId: $communityId})
        DELETE r
    `;
    await writeQuery(cypher, { 
        userId: userId.toString(), 
        communityId: communityId.toString() 
    });
    return true;
};

// --- BLOCKS ---

export const blockUser = async (blockerId, blockedId) => {
    // Also remove FOLLOWS and FRIEND if they block
    const cypher = `
        MATCH (blocker:User {mongoId: $blockerId})
        MATCH (blocked:User {mongoId: $blockedId})
        OPTIONAL MATCH (blocker)-[f1:FOLLOWS|FRIEND]-(blocked)
        DELETE f1
        MERGE (blocker)-[b:BLOCKS]->(blocked)
        ON CREATE SET b.createdAt = datetime()
        RETURN b
    `;
    await writeQuery(cypher, { 
        blockerId: blockerId.toString(), 
        blockedId: blockedId.toString() 
    });
    return true;
};

export const unblockUser = async (blockerId, blockedId) => {
    const cypher = `
        MATCH (blocker:User {mongoId: $blockerId})-[r:BLOCKS]->(blocked:User {mongoId: $blockedId})
        DELETE r
    `;
    await writeQuery(cypher, { 
        blockerId: blockerId.toString(), 
        blockedId: blockedId.toString() 
    });
    return true;
};
