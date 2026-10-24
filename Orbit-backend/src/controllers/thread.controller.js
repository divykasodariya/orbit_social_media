import mongoose from "mongoose";
import { Thread } from "../models/thread.model.js";
import { ThreadVote } from "../models/threadVote.model.js";
import { Comment } from "../models/comment.model.js";
import { Community } from "../models/community.model.js";
import { CommunityMembership } from "../models/communityMembership.model.js";
import { Report } from "../models/report.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getThreadSortPipeline, applyHotSortIfRequired } from "../services/ranking.service.js";

// Ensure user is part of community
const verifyCommunityMembership = async (userId, communityId) => {
    const membership = await CommunityMembership.findOne({ userId, communityId, status: "APPROVED" });
    if (!membership) {
        throw new ApiError(403, "You must be an approved member of this community");
    }
    return membership;
};

// Ensure user is moderator or owner
const verifyModerator = async (userId, communityId) => {
    const membership = await CommunityMembership.findOne({ userId, communityId, role: { $in: ["OWNER", "MODERATOR"] } });
    if (!membership) {
        throw new ApiError(403, "Moderator access required");
    }
    return membership;
};

export const createThread = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const { title, body, media, flair } = req.body;
    const authorId = req.user._id;

    if (!title) throw new ApiError(400, "Title is required");

    await verifyCommunityMembership(authorId, communityId);

    const thread = await Thread.create({
        communityId,
        authorId,
        title,
        body,
        media,
        flair
    });

    return res.status(201).json(new ApiResponse(201, thread, "Thread created successfully"));
});

export const getCommunityThreads = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const { page = 1, limit = 20, sort = "hot" } = req.query;

    const aggregatePipeline = [
        { $match: { communityId: new mongoose.Types.ObjectId(communityId), isModeratorRemoved: false } },
        getThreadSortPipeline(sort),
        // Populate author details
        {
            $lookup: {
                from: "users",
                localField: "authorId",
                foreignField: "_id",
                as: "authorId",
                pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }]
            }
        },
        { $unwind: { path: "$authorId", preserveNullAndEmptyArrays: true } }
    ];

    const sortApplier = applyHotSortIfRequired(sort);
    if (sortApplier) aggregatePipeline.push(sortApplier);

    const aggregateQuery = Thread.aggregate(aggregatePipeline);
    const options = { page: parseInt(page, 10), limit: parseInt(limit, 10) };
    
    const threads = await Thread.aggregatePaginate(aggregateQuery, options);

    return res.status(200).json(new ApiResponse(200, threads, "Threads fetched successfully"));
});

export const getThreadById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const thread = await Thread.findOne({ _id: id, isModeratorRemoved: false }).populate("authorId", "username avatar");

    if (!thread) throw new ApiError(404, "Thread not found or removed");

    return res.status(200).json(new ApiResponse(200, thread, "Thread fetched successfully"));
});

export const updateThread = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { body, media, flair } = req.body;
    const userId = req.user._id;

    const thread = await Thread.findById(id);
    if (!thread || thread.isModeratorRemoved) throw new ApiError(404, "Thread not found");

    if (thread.authorId.toString() !== userId.toString()) {
        throw new ApiError(403, "You can only edit your own threads");
    }

    if (body !== undefined) thread.body = body;
    if (media !== undefined) thread.media = media;
    if (flair !== undefined) thread.flair = flair;

    await thread.save();

    return res.status(200).json(new ApiResponse(200, thread, "Thread updated successfully"));
});

export const deleteThread = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const thread = await Thread.findById(id);
    if (!thread) throw new ApiError(404, "Thread not found");

    if (thread.authorId.toString() !== userId.toString()) {
        // Check if moderator
        await verifyModerator(userId, thread.communityId);
        thread.isModeratorRemoved = true;
        await thread.save();
        return res.status(200).json(new ApiResponse(200, {}, "Thread removed by moderator"));
    }

    await Thread.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, {}, "Thread deleted successfully"));
});

export const voteThread = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { value } = req.body; // 1 or -1
    const userId = req.user._id;

    if (![1, -1].includes(value)) throw new ApiError(400, "Invalid vote value");

    const thread = await Thread.findById(id);
    if (!thread || thread.isModeratorRemoved) throw new ApiError(404, "Thread not found");

    const existingVote = await ThreadVote.findOne({ threadId: id, userId });

    let scoreChange = 0;

    if (existingVote) {
        if (existingVote.value === value) {
            return res.status(200).json(new ApiResponse(200, thread, "Already voted"));
        }
        scoreChange = value - existingVote.value; // e.g. 1 - (-1) = 2
        existingVote.value = value;
        await existingVote.save();
    } else {
        scoreChange = value;
        await ThreadVote.create({ threadId: id, userId, value });
    }

    thread.score += scoreChange;
    await thread.save();

    return res.status(200).json(new ApiResponse(200, thread, "Vote registered"));
});

export const deleteVoteThread = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const thread = await Thread.findById(id);
    if (!thread) throw new ApiError(404, "Thread not found");

    const existingVote = await ThreadVote.findOneAndDelete({ threadId: id, userId });

    if (existingVote) {
        thread.score -= existingVote.value;
        await thread.save();
    }

    return res.status(200).json(new ApiResponse(200, thread, "Vote removed"));
});

export const addThreadComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user._id;

    if (!content) throw new ApiError(400, "Comment content required");

    const thread = await Thread.findById(id);
    if (!thread || thread.isModeratorRemoved) throw new ApiError(404, "Thread not found");

    await verifyCommunityMembership(userId, thread.communityId);

    const comment = await Comment.create({
        content,
        owner: userId,
        thread: id,
        parentComment: parentCommentId || null
    });

    thread.commentCount += 1;
    await thread.save();

    // Populate owner so frontend can render immediately
    await comment.populate("owner", "username fullName avatar");

    return res.status(201).json(new ApiResponse(201, comment, "Comment added successfully"));
});

export const getThreadComments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 50, parentId = null } = req.query;

    const aggregateQuery = Comment.aggregate([
        { $match: { 
            thread: new mongoose.Types.ObjectId(id), 
            isModeratorRemoved: false,
            parentComment: parentId ? new mongoose.Types.ObjectId(parentId) : null
        }},
        { $sort: { createdAt: 1 } },  // oldest first like Reddit
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }]
            }
        },
        { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } }
    ]);

    const options = { page: parseInt(page, 10), limit: parseInt(limit, 10) };
    const comments = await Comment.aggregatePaginate(aggregateQuery, options);

    return res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

export const reportItem = asyncHandler(async (req, res) => {
    const { targetId, targetType, reason, communityId } = req.body;
    const userId = req.user._id;

    if (!["Thread", "Comment"].includes(targetType)) {
        throw new ApiError(400, "Invalid target type");
    }

    const report = await Report.create({
        reporter: userId,
        reason,
        targetType,
        targetId,
        targetTypeModel: targetType,
        communityId
    });

    return res.status(201).json(new ApiResponse(201, report, "Report submitted successfully"));
});
