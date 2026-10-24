import { readQuery } from "../graph/neo4j.service.js";
import { calculateJaccardSimilarity } from "./scoring.service.js";
import { FriendRequest } from "../../models/friendRequest.model.js";

/**
 * Generate user recommendations based on Jaccard similarity of FRIEND sets,
 * excluding the current user, existing friends, followed users, and blocked users.
 * Falls back to random users from the platform when the FOF graph is empty.
 */
export const recommendUsers = async (userId, limit = 10) => {
    try {
        // 1. Advanced Graph Recommendation Query (Single Query)
        // Finds candidates through 2-hop paths (Friends or Communities)
        // Ranks them by a weighted score of mutual friends and mutual communities
        const advancedCypher = `
            MATCH (u:User {mongoId: $userId})
            
            // Find candidates who are 2 hops away via FRIEND or MEMBER_OF
            // The *1..2 ensures we get direct neighbors of our neighbors
            MATCH (u)-[:FRIEND|MEMBER_OF*2]-(candidate:User)
            
            WHERE u <> candidate
              AND NOT (u)-[:FRIEND]-(candidate)
              AND NOT (u)-[:FOLLOWS]->(candidate)
              AND NOT (u)-[:BLOCKS]-(candidate)
              
            WITH DISTINCT u, candidate
            
            // Count mutual friends
            OPTIONAL MATCH (u)-[:FRIEND]-(mf:User)-[:FRIEND]-(candidate)
            WITH u, candidate, count(DISTINCT mf) AS mutualFriendsCount
            
            // Count mutual communities
            OPTIONAL MATCH (u)-[:MEMBER_OF]->(mc:Community)<-[:MEMBER_OF]-(candidate)
            WITH candidate, mutualFriendsCount, count(DISTINCT mc) AS mutualCommsCount
            
            // Calculate weighted score (Friends count more than communities)
            WITH candidate, mutualFriendsCount, mutualCommsCount,
                 (mutualFriendsCount * 2.0 + mutualCommsCount * 1.0) AS score
                 
            WHERE score > 0
            
            ORDER BY score DESC
            LIMIT toInteger($limit)
            
            RETURN candidate.mongoId AS candidateId, score, mutualFriendsCount, mutualCommsCount
        `;
        
        const result = await readQuery(advancedCypher, { 
            userId: userId.toString(), 
            limit: parseInt(limit) 
        });

        if (result && result.length > 0) {
            return result.map(record => {
                const mutualFriends = record.get('mutualFriendsCount').toNumber();
                const mutualComms = record.get('mutualCommsCount').toNumber();
                
                let reasons = [];
                if (mutualFriends > 0) reasons.push(`${mutualFriends} mutual friend${mutualFriends > 1 ? 's' : ''}`);
                if (mutualComms > 0) reasons.push(`${mutualComms} shared communit${mutualComms > 1 ? 'ies' : 'y'}`);
                
                return {
                    userId: record.get('candidateId'),
                    score: record.get('score'),
                    reason: reasons.join(' • ')
                };
            });
        }

        // 4. Fallback: no FOF candidates — suggest random users the current user isn't friends with
        const randomCypher = `
            MATCH (candidate:User)
            WHERE candidate.mongoId <> $userId
            AND NOT ((:User {mongoId: $userId})-[:FRIEND]-(candidate))
            AND NOT ((:User {mongoId: $userId})-[:BLOCKS]->(candidate))
            RETURN candidate.mongoId AS candidateId
            LIMIT ${limit * 2}
        `;
        const randomResult = await readQuery(randomCypher, { userId: userId.toString() });

        if (randomResult && randomResult.length > 0) {
            return randomResult.map(r => ({
                userId: r.get('candidateId'),
                score: 0,
                reason: 'People on Orbit'
            })).slice(0, limit);
        }

        return [];

    } catch (error) {
        console.error("Neo4j Recommendation failed, falling back to MongoDB:", error.message);

        // MongoDB Fallback
        const userFriendships = await FriendRequest.find({
            $or: [{ sender: userId }, { receiver: userId }],
            status: "ACCEPTED"
        });

        const userFriends = userFriendships.map(f =>
            f.sender.toString() === userId.toString() ? f.receiver.toString() : f.sender.toString()
        );

        if (userFriends.length > 0) {
            const candidateFriendships = await FriendRequest.find({
                $or: [
                    { sender: { $in: userFriends } },
                    { receiver: { $in: userFriends } }
                ],
                status: "ACCEPTED"
            });

            const candidateScores = {};

            candidateFriendships.forEach(f => {
                const candidate = userFriends.includes(f.sender.toString())
                    ? f.receiver.toString()
                    : f.sender.toString();

                if (candidate !== userId.toString() && !userFriends.includes(candidate)) {
                    candidateScores[candidate] = (candidateScores[candidate] || 0) + 1;
                }
            });

            const recommendations = Object.entries(candidateScores).map(([candidateId, count]) => ({
                userId: candidateId,
                score: count * 0.1,
                reason: `${count} mutual friend${count !== 1 ? 's' : ''}`
            }));

            if (recommendations.length > 0) {
                return recommendations
                    .sort((a, b) => b.score - a.score)
                    .slice(0, limit);
            }
        }

        // Final fallback: random users from MongoDB
        const { User } = await import("../../models/user.model.js");
        const excludeIds = [userId.toString(), ...userFriends];
        const randomUsers = await User.find({
            _id: { $nin: excludeIds }
        }).select("_id").limit(limit);

        return randomUsers.map(u => ({
            userId: u._id.toString(),
            score: 0,
            reason: 'People on Orbit'
        }));
    }
};
