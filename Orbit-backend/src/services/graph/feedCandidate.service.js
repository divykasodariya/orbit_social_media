import { readQuery } from "./neo4j.service.js";
import { Thread } from "../../models/thread.model.js";
import { Video } from "../../models/video.model.js";
import { Tweet } from "../../models/tweet.model.js";
import { CommunityMembership } from "../../models/communityMembership.model.js";
import { Subscription } from "../../models/subscription.model.js";
import mongoose from "mongoose";

// Returns an array of normalized feed items
const normalize = (items, type, reasonBuilder) => {
    return items.map(item => ({
        type,
        contentId: item._id,
        authorId: item.authorId || item.owner,
        communityId: item.communityId || null,
        score: item.score || item.views || 0, // Fallback to views for videos
        createdAt: item.createdAt,
        reason: reasonBuilder(item),
        // include full document for returning directly if needed, or fetch later
        raw: item
    }));
};

/**
 * 1. Threads from joined communities
 */
export const getCommunityThreadCandidates = async (userId, limit = 50) => {
    // Get user's approved communities
    const memberships = await CommunityMembership.find({ userId, status: "APPROVED" }).select("communityId");
    const communityIds = memberships.map(m => m.communityId);

    if (communityIds.length === 0) return [];

    const threads = await Thread.find({ 
        communityId: { $in: communityIds },
        isModeratorRemoved: false
    }).populate("authorId", "fullName username avatar")
      .populate("communityId", "name slug avatar")
      .sort({ createdAt: -1 }).limit(limit).lean();

    return normalize(threads, 'THREAD', () => "From a community you joined");
};

/**
 * 2. Videos from followed creators (Subscriptions)
 */
export const getSubscriptionVideoCandidates = async (userId, limit = 50) => {
    const subscriptions = await Subscription.find({ subscriber: userId }).select("channel");
    const channelIds = subscriptions.map(s => s.channel);

    if (channelIds.length === 0) return [];

    const videos = await Video.find({ 
        owner: { $in: channelIds },
        isPublished: true,
        isShadowBanned: { $ne: true }
    }).populate("owner", "fullName username avatar")
      .sort({ createdAt: -1 }).limit(limit).lean();

    return normalize(videos, 'VIDEO', () => "Because you follow this creator");
};

/**
 * 3. Posts (Tweets) from Friends (via Neo4j)
 */
export const getFriendPostCandidates = async (userId, limit = 50) => {
    // Fetch friends via Neo4j
    const cypher = `
        MATCH (u:User {mongoId: $userId})-[:FRIEND]-(friend:User)
        RETURN friend.mongoId AS friendId
    `;
    let friendIds = [];
    try {
        const result = await readQuery(cypher, { userId: userId.toString() });
        if (result && result.length > 0) {
            friendIds = result.map(record => new mongoose.Types.ObjectId(record.get('friendId')));
        }
    } catch (e) {
        console.warn("Graph query failed, falling back gracefully:", e.message);
    }

    if (friendIds.length === 0) return [];

    const posts = await Tweet.find({ 
        owner: { $in: friendIds }
    }).populate("owner", "fullName username avatar")
      .sort({ createdAt: -1 }).limit(limit).lean();

    return normalize(posts, 'POST', () => "Posted by a friend");
};

/**
 * 4. Trending/Popular fallback candidates
 */
export const getPopularCandidates = async (limit = 20) => {
    const popularVideos = await Video.find({ 
        isPublished: true,
        isShadowBanned: { $ne: true }
    }).populate("owner", "fullName username avatar").sort({ views: -1 }).limit(limit).lean();
    const popularThreads = await Thread.find({ isModeratorRemoved: false }).populate("authorId", "fullName username avatar").populate("communityId", "name slug avatar").sort({ score: -1 }).limit(limit).lean();
    // Tweets don't have score by default, just use recent
    const recentPosts = await Tweet.find({}).populate("owner", "fullName username avatar").sort({ createdAt: -1 }).limit(limit).lean();

    return [
        ...normalize(popularVideos, 'VIDEO', () => "Popular video right now"),
        ...normalize(popularThreads, 'THREAD', () => "Trending community thread"),
        ...normalize(recentPosts, 'POST', () => "Recent post")
    ];
};

/**
 * Get blocked user IDs via Neo4j
 */
export const getBlockedUsers = async (userId) => {
    const cypher = `
        MATCH (u:User {mongoId: $userId})-[:BLOCKS]->(blocked:User)
        RETURN blocked.mongoId AS blockedId
    `;
    try {
        const result = await readQuery(cypher, { userId: userId.toString() });
        if (!result) return [];
        return result.map(r => r.get('blockedId'));
    } catch (e) {
        console.warn("Blocked users graph query failed:", e.message);
        return [];
    }
};

/**
 * Master candidate generation
 */
export const generateCandidates = async (userId, limit = 100) => {
    const [communityThreads, subVideos, friendPosts, popular] = await Promise.all([
        getCommunityThreadCandidates(userId, limit),
        getSubscriptionVideoCandidates(userId, limit),
        getFriendPostCandidates(userId, limit),
        getPopularCandidates(limit)
    ]);

    let candidates = [...communityThreads, ...subVideos, ...friendPosts, ...popular];

    return candidates;
};
