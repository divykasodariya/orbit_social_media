import { generateCandidates, getBlockedUsers } from "./feedCandidate.service.js";
import { rankCandidates } from "./feedRanking.service.js";
import { Community } from "../../models/community.model.js";
import { Like } from "../../models/like.model.js";
import { ThreadVote } from "../../models/threadVote.model.js";

/**
 * The Master Feed Pipeline.
 * 
 * 1. Generate candidates
 * 2. Apply block rules
 * 3. Remove duplicates
 * 4. Apply visibility/privacy rules
 * 5. Calculate ranking signals & Rank
 * 6. Return cursor paginated results
 */
export const getUnifiedFeed = async (userId, cursor, limit = 20) => {
    // 1. Generate Candidates
    let candidates = await generateCandidates(userId, 50);

    // 2. Apply Block Rules
    const blockedUserIds = await getBlockedUsers(userId);
    const blockedSet = new Set(blockedUserIds.map(id => id.toString()));
    
    candidates = candidates.filter(c => !blockedSet.has(c.authorId?.toString()));

    // 3. Remove Duplicates (By contentId)
    const seen = new Set();
    candidates = candidates.filter(c => {
        const id = c.contentId.toString();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    // 4. Apply Visibility/Privacy Rules
    // - Videos: must be isPublished (already handled in candidate generation)
    // - Threads: must not be in a PRIVATE community unless user is a member.
    // Optimization: Community Thread candidates ONLY pull from joined communities,
    // but the 'Popular' fallback might pull a thread from a PRIVATE community.
    const threadCommunityIds = candidates
        .filter(c => c.type === 'THREAD' && c.communityId)
        .map(c => c.communityId);
        
    if (threadCommunityIds.length > 0) {
        // Find which of these communities are private
        const privateCommunities = await Community.find({ 
            _id: { $in: threadCommunityIds }, 
            privacy: "PRIVATE" 
        }).select("_id");
        
        const privateCommunityIds = new Set(privateCommunities.map(c => c._id.toString()));
        
        // Exclude threads that are from private communities AND aren't matched by the 'joined' reason
        candidates = candidates.filter(c => {
            if (c.type === 'THREAD' && c.communityId && privateCommunityIds.has(c.communityId.toString())) {
                return c.reason.includes("community you joined");
            }
            return true; // Keep everything else
        });
    }

    // 5. Rank Candidates
    const ranked = rankCandidates(candidates);

    // 6. Pagination using a simple index/cursor based on finalScore
    // For a stateless cursor over a dynamic pool, we can encode the 'finalScore' as the cursor.
    // Example: cursor = "0.01423"
    let startIndex = 0;
    if (cursor) {
        const cursorScore = parseFloat(Buffer.from(cursor, 'base64').toString('ascii'));
        startIndex = ranked.findIndex(c => c.finalScore <= cursorScore);
        // If exact match not found or cursor is at end, startIndex = length
        if (startIndex === -1) startIndex = ranked.length;
    }

    // Since we generate dynamically, if they ask for page 2 (cursor), we must ensure 
    // the dynamic generation produced enough candidates. If it didn't, we just return empty.
    // In a real at-scale system, the pool is cached per user.
    const paginated = ranked.slice(startIndex, startIndex + limit);

    // Prepare next cursor
    let nextCursor = null;
    if (startIndex + limit < ranked.length) {
        const nextItem = ranked[startIndex + limit];
        nextCursor = Buffer.from(nextItem.finalScore.toString()).toString('base64');
    }

    // 7. Enrich paginated items with user-specific metadata (likes, votes)
    const enrichedPaginated = await Promise.all(paginated.map(async (c) => {
        if (c.type === 'POST') {
            const likesCount = await Like.countDocuments({ tweet: c.contentId });
            const isLiked = await Like.exists({ tweet: c.contentId, likedBy: userId });
            c.raw.likesCount = likesCount;
            c.raw.isLiked = !!isLiked;
        } else if (c.type === 'THREAD') {
            const vote = await ThreadVote.findOne({ threadId: c.contentId, userId }).lean();
            c.raw.userVote = vote ? vote.value : 0;
        }
        return c;
    }));

    return {
        feed: enrichedPaginated,
        nextCursor
    };
};
