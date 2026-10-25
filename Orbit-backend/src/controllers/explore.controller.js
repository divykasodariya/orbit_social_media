import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Thread } from "../models/thread.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Community } from "../models/community.model.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ThreadVote } from "../models/threadVote.model.js";

// Helper to normalize feed items
const normalize = (items, type, reasonBuilder) => {
    return items.map(item => ({
        type,
        contentId: item._id,
        authorId: item.authorId || item.owner,
        communityId: item.communityId || null,
        score: item.score || item.views || 0,
        createdAt: item.createdAt,
        reason: reasonBuilder(item),
        raw: item
    }));
};

export const getExploreFeed = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    // Fetch popular items with pagination (excluding shadow banned videos)
    const popularVideos = await Video.find({ 
        isPublished: true,
        isShadowBanned: { $ne: true }
    })
        .populate("owner", "fullName username avatar")
        .sort({ views: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const popularThreads = await Thread.find({ isModeratorRemoved: false })
        .populate("authorId", "fullName username avatar")
        .populate("communityId", "name slug avatar")
        .sort({ score: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const recentPosts = await Tweet.find({})
        .populate("owner", "fullName username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    let items = [
        ...normalize(popularVideos, 'VIDEO', () => "Popular video right now"),
        ...normalize(popularThreads, 'THREAD', () => "Trending community thread"),
        ...normalize(recentPosts, 'POST', () => "Recent post")
    ];

    // Shuffle the items for variety
    items.sort(() => Math.random() - 0.5);

    const userId = req.user?._id;
    const enrichedItems = await Promise.all(items.map(async (c) => {
        if (c.type === 'POST') {
            const likesCount = await Like.countDocuments({ tweet: c.contentId });
            let isLiked = false;
            if (userId) {
                isLiked = await Like.exists({ tweet: c.contentId, likedBy: userId });
            }
            c.raw.likesCount = likesCount;
            c.raw.isLiked = !!isLiked;
        } else if (c.type === 'THREAD') {
            if (userId) {
                const vote = await ThreadVote.findOne({ threadId: c.contentId, userId }).lean();
                c.raw.userVote = vote ? vote.value : 0;
            } else {
                c.raw.userVote = 0;
            }
        }
        return c;
    }));

    return res.status(200).json(
        new ApiResponse(
            200, 
            { items: enrichedItems, nextCursor: enrichedItems.length > 0 ? page + 1 : null }, 
            "Explore feed fetched successfully"
        )
    );
});

export const getExploreHighlights = asyncHandler(async (req, res) => {
    const userId = req.user ? req.user._id : null;

    // 1. Trending Communities
    // For now, get largest communities by member count (if memberCount exists, or just random)
    const communities = await Community.find({ privacy: "PUBLIC" })
        .sort({ memberCount: -1, createdAt: -1 })
        .limit(10)
        .lean();

    // 2. Creators on the Rise
    // Exclude current user and users they already follow
    let excludeIds = userId ? [userId] : [];
    
    if (userId) {
        const subscriptions = await Subscription.find({ subscriber: userId }).select("channel");
        excludeIds = [...excludeIds, ...subscriptions.map(s => s.channel)];
    }

    // A simple query to get popular creators by subscribers, or just recent active users
    // Let's get random users or recently created users
    const creators = await User.find({ _id: { $nin: excludeIds } })
        .select("fullName username avatar")
        .limit(10)
        .lean();
    
    // Shuffle creators
    creators.sort(() => Math.random() - 0.5);

    return res.status(200).json(
        new ApiResponse(
            200, 
            { communities, creators }, 
            "Explore highlights fetched successfully"
        )
    );
});
