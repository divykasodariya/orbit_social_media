import { writeQuery, readQuery } from './neo4j.service.js';

// --- VIDEO INTERACTIONS ---

// 1. USER VIEWS VIDEO
export const viewVideo = async (userId, videoId) => {
    const cypher = `
        MATCH (u:User {mongoId: $userId})
        MERGE (v:Video {mongoId: $videoId})
        MERGE (u)-[r:VIEWED]->(v)
        ON CREATE SET
            r.viewCount = 1,
            r.firstViewedAt = datetime(),
            r.lastViewedAt = datetime()
        ON MATCH SET
            r.viewCount = r.viewCount + 1,
            r.lastViewedAt = datetime()
        RETURN r
    `;

    const result = await writeQuery(cypher, {
        userId: userId.toString(),
        videoId: videoId.toString()
    });

    return result ? true : false;
};


// 2. USER LIKES VIDEO
export const likeVideo = async (userId, videoId) => {
    const cypher = `
        MATCH (u:User {mongoId: $userId})
        MERGE (v:Video {mongoId: $videoId})
        MERGE (u)-[r:LIKED]->(v)
        ON CREATE SET r.createdAt = datetime()
        RETURN r
    `;

    const result = await writeQuery(cypher, {
        userId: userId.toString(),
        videoId: videoId.toString()
    });

    return result ? true : false;
};


// 3. USER UNLIKES VIDEO
export const unlikeVideo = async (userId, videoId) => {
    const cypher = `
        MATCH (u:User {mongoId: $userId})-[r:LIKED]->
              (v:Video {mongoId: $videoId})
        DELETE r
    `;

    await writeQuery(cypher, {
        userId: userId.toString(),
        videoId: videoId.toString()
    });

    return true;
};


// 4. USER COMMENTS ON VIDEO
export const commentOnVideo = async (
    userId,
    videoId,
    commentId,
    commentText
) => {
    const cypher = `
        MATCH (u:User {mongoId: $userId})
        MERGE (v:Video {mongoId: $videoId})
        MERGE (u)-[r:COMMENTED {mongoId: $commentId}]->(v)
        ON CREATE SET r.createdAt = datetime()
        SET r.text = $commentText
        RETURN r
    `;

    const result = await writeQuery(cypher, {
        userId: userId.toString(),
        videoId: videoId.toString(),
        commentId: commentId.toString(),
        commentText
    });

    return result ? true : false;
};


// 5. DELETE USER COMMENT
export const deleteVideoComment = async (
    userId,
    commentId
) => {
    const cypher = `
        MATCH (u:User {mongoId: $userId})
              -[r:COMMENTED {mongoId: $commentId}]->
              (v:Video)
        DELETE r
    `;

    await writeQuery(cypher, {
        userId: userId.toString(),
        commentId: commentId.toString()
    });

    return true;
};


export const createVideoNode = async (videoId, ownerId, title, description) => {
    const cypher = `
        MATCH (u:User {mongoId: $ownerId})
        MERGE (v:Video {mongoId: $videoId})
        ON CREATE SET
            v.title = $title,
            v.description = $description,
            v.createdAt = datetime()
        MERGE (u)-[:UPLOADED]->(v)
        RETURN v
    `;

    const result = await writeQuery(cypher, {
        videoId: videoId.toString(),
        ownerId: ownerId.toString(),
        title,
        description
    });

    return result ? true : false;
};