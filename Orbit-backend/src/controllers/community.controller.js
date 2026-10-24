import mongoose from "mongoose";
import { Community } from "../models/community.model.js";
import { CommunityMembership } from "../models/communityMembership.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createCommunityNode, deleteCommunityNode } from "../services/graph/communityGraph.service.js";
import { joinCommunity as joinGraphCommunity, leaveCommunity as leaveGraphCommunity } from "../services/graph/relationshipGraph.service.js";

const createCommunity = asyncHandler(async (req, res) => {
    const { name, slug, description, rules, privacy } = req.body;
    const userId = req.user._id;

    if (!name || !slug) {
        throw new ApiError(400, "Name and slug are required");
    }

    const existingCommunity = await Community.findOne({ slug: slug.toLowerCase() });
    if (existingCommunity) {
        throw new ApiError(400, "Community slug must be unique");
    }

    // Use a transaction for creating both models
    const session = await mongoose.startSession();
    session.startTransaction();

    let newCommunity;
    try {
        newCommunity = await Community.create([{
            name,
            slug,
            description,
            rules: rules || [],
            privacy: privacy || "PUBLIC",
            creator: userId,
            memberCount: 1
        }], { session });

        await CommunityMembership.create([{
            userId,
            communityId: newCommunity[0]._id,
            role: "OWNER",
            status: "APPROVED"
        }], { session });

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, "Failed to create community");
    } finally {
        session.endSession();
    }

    const community = newCommunity[0];

    // Sync to Neo4j
    try {
        await createCommunityNode(community._id);
        await joinGraphCommunity(userId, community._id);
    } catch (graphError) {
        console.error("Neo4j sync failed for createCommunity, continuing without graph support:", graphError.message);
    }

    return res.status(201).json(new ApiResponse(201, community, "Community created successfully"));
});

const getCommunities = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const aggregateQuery = Community.aggregate([
        { $match: { privacy: "PUBLIC" } },
        { $sort: { memberCount: -1 } },
        // Lookup if the current user is a member
        {
            $lookup: {
                from: "communitymemberships",
                let: { communityId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$communityId", "$$communityId"] },
                                    { $eq: ["$userId", userObjectId] },
                                    { $eq: ["$status", "APPROVED"] }
                                ]
                            }
                        }
                    },
                    { $limit: 1 }
                ],
                as: "myMembership"
            }
        },
        {
            $addFields: {
                isMember: { $gt: [{ $size: "$myMembership" }, 0] }
            }
        },
        { $project: { myMembership: 0 } }
    ]);

    const communities = await Community.aggregatePaginate(aggregateQuery, options);
    return res.status(200).json(new ApiResponse(200, communities, "Communities fetched successfully"));
});


const getCommunityBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const community = await Community.findOne({ slug: slug.toLowerCase() }).populate("creator", "username fullName avatar");

    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    return res.status(200).json(new ApiResponse(200, community, "Community fetched successfully"));
});

const updateCommunity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, rules, privacy } = req.body;
    const userId = req.user._id;

    const community = await Community.findById(id);
    if (!community) throw new ApiError(404, "Community not found");

    const membership = await CommunityMembership.findOne({ userId, communityId: id });
    if (!membership || !["OWNER", "MODERATOR"].includes(membership.role)) {
        throw new ApiError(403, "You do not have permission to update this community");
    }

    if (name) community.name = name;
    if (description !== undefined) community.description = description;
    if (rules) community.rules = rules;
    if (privacy) community.privacy = privacy;

    await community.save();

    return res.status(200).json(new ApiResponse(200, community, "Community updated successfully"));
});

const deleteCommunity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const community = await Community.findById(id);
    if (!community) throw new ApiError(404, "Community not found");

    if (community.creator.toString() !== userId.toString()) {
        throw new ApiError(403, "Only the creator can delete the community");
    }

    // Delete community and memberships
    await CommunityMembership.deleteMany({ communityId: id });
    await Community.findByIdAndDelete(id);

    // Remove from Neo4j
    try {
        await deleteCommunityNode(id);
    } catch (graphError) {
        console.error("Neo4j sync failed for deleteCommunity, continuing without graph support:", graphError.message);
    }

    return res.status(200).json(new ApiResponse(200, {}, "Community deleted successfully"));
});

const joinCommunityHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const community = await Community.findById(id);
    if (!community) throw new ApiError(404, "Community not found");

    const existingMembership = await CommunityMembership.findOne({ userId, communityId: id });
    if (existingMembership) {
        throw new ApiError(400, "You are already a member or have a pending request");
    }

    const status = community.privacy === "PRIVATE" ? "PENDING" : "APPROVED";

    const membership = await CommunityMembership.create({
        userId,
        communityId: id,
        role: "MEMBER",
        status
    });

    if (status === "APPROVED") {
        community.memberCount += 1;
        await community.save();
        try {
            await joinGraphCommunity(userId, id);
        } catch (graphError) {
            console.error("Neo4j sync failed for joinCommunity, continuing without graph support:", graphError.message);
        }
    }

    return res.status(200).json(new ApiResponse(200, membership, status === "APPROVED" ? "Joined community" : "Join request sent"));
});

const leaveCommunityHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const membership = await CommunityMembership.findOne({ userId, communityId: id });
    if (!membership) {
        throw new ApiError(400, "You are not a member of this community");
    }

    if (membership.role === "OWNER") {
        const ownerCount = await CommunityMembership.countDocuments({ communityId: id, role: "OWNER" });
        if (ownerCount <= 1) {
            throw new ApiError(400, "The last owner cannot leave the community. Transfer ownership or delete the community.");
        }
    }

    await CommunityMembership.findByIdAndDelete(membership._id);

    const community = await Community.findById(id);
    if (community && membership.status === "APPROVED") {
        community.memberCount = Math.max(0, community.memberCount - 1);
        await community.save();
        try {
            await leaveGraphCommunity(userId, id);
        } catch (graphError) {
            console.error("Neo4j sync failed for leaveCommunity, continuing without graph support:", graphError.message);
        }
    }

    return res.status(200).json(new ApiResponse(200, {}, "Left community successfully"));
});

const getCommunityMembers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const aggregateQuery = CommunityMembership.aggregate([
        { $match: { communityId: new mongoose.Types.ObjectId(id), status: "APPROVED" } },
        { $sort: { role: 1, createdAt: -1 } },
        // Proper $lookup instead of populate (which doesn't work with aggregatePaginate)
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId",
                pipeline: [{ $project: { username: 1, fullName: 1, avatar: 1 } }]
            }
        },
        { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } }
    ]);

    const members = await CommunityMembership.aggregatePaginate(aggregateQuery, options);
    return res.status(200).json(new ApiResponse(200, members, "Members fetched successfully"));
});

const searchCommunities = asyncHandler(async (req, res) => {
    const { q = "", page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const aggregateQuery = Community.aggregate([
        { 
            $match: { 
                privacy: "PUBLIC",
                $or: [
                    { name: { $regex: q, $options: "i" } },
                    { slug: { $regex: q, $options: "i" } },
                    { description: { $regex: q, $options: "i" } }
                ]
            } 
        },
        { $sort: { memberCount: -1 } },
        {
            $lookup: {
                from: "communitymemberships",
                let: { communityId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$communityId", "$$communityId"] },
                                    { $eq: ["$userId", userObjectId] },
                                    { $eq: ["$status", "APPROVED"] }
                                ]
                            }
                        }
                    },
                    { $limit: 1 }
                ],
                as: "myMembership"
            }
        },
        {
            $addFields: {
                isMember: { $gt: [{ $size: "$myMembership" }, 0] }
            }
        },
        { $project: { myMembership: 0 } }
    ]);

    const results = await Community.aggregatePaginate(aggregateQuery, options);
    return res.status(200).json(new ApiResponse(200, results, "Search results fetched"));
});

export {
    createCommunity,
    getCommunities,
    getCommunityBySlug,
    updateCommunity,
    deleteCommunity,
    joinCommunityHandler,
    leaveCommunityHandler,
    getCommunityMembers,
    searchCommunities
};
