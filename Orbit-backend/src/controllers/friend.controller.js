import mongoose from "mongoose";
import { FriendRequest } from "../models/friendRequest.model.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { addFriend, removeFriend } from "../services/graph/relationshipGraph.service.js";
import { findShortestPathBfs } from "../services/graph/graphAlgorithms.service.js";
import { readQuery } from "../services/graph/neo4j.service.js";

import { Notification } from "../models/notification.model.js";

const sendFriendRequest = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const senderId = req.user._id;

    if (senderId.toString() === userId.toString()) {
        throw new ApiError(400, "You cannot send a friend request to yourself");
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
        throw new ApiError(404, "User not found");
    }

    // Check block list (Neo4j) - if blocked, do not allow
    let isBlocked = false;
    try {
        const blockCheckCypher = `
            MATCH (u1:User {mongoId: $senderId})-[r:BLOCKS]-(u2:User {mongoId: $userId})
            RETURN r
        `;
        const blockResult = await readQuery(blockCheckCypher, { senderId: senderId.toString(), userId: userId.toString() });
        if (blockResult && blockResult.length > 0) {
            isBlocked = true;
        }
    } catch (err) {
        console.warn("Neo4j block check failed, skipping:", err.message);
    }

    if (isBlocked) {
        throw new ApiError(403, "Cannot send request due to block policy");
    }

    // Check if already friends
    let isFriend = false;
    try {
        const friendCheckCypher = `
            MATCH (u1:User {mongoId: $senderId})-[r:FRIEND]-(u2:User {mongoId: $userId})
            RETURN r
        `;
        const friendResult = await readQuery(friendCheckCypher, { senderId: senderId.toString(), userId: userId.toString() });
        if (friendResult && friendResult.length > 0) {
            isFriend = true;
        }
    } catch (err) {
        console.warn("Neo4j friend check failed, falling back to MongoDB:", err.message);
        const existingFriend = await FriendRequest.findOne({
            $or: [
                { sender: senderId, receiver: userId },
                { sender: userId, receiver: senderId }
            ],
            status: "ACCEPTED"
        });
        if (existingFriend) isFriend = true;
    }

    if (isFriend) {
        throw new ApiError(400, "You are already friends");
    }

    // Check existing request
    const existingRequest = await FriendRequest.findOne({
        $or: [
            { sender: senderId, receiver: userId },
            { sender: userId, receiver: senderId }
        ],
        status: "PENDING"
    });

    if (existingRequest) {
        throw new ApiError(400, "Friend request already pending");
    }

    const request = await FriendRequest.create({
        sender: senderId,
        receiver: userId,
        status: "PENDING"
    });

    // Create Notification
    await Notification.create({
        recipient: userId,
        sender: senderId,
        type: 'FRIEND_REQUEST',
        message: 'sent you a friend request.'
    });

    return res.status(201).json(new ApiResponse(201, request, "Friend request sent"));
});

const acceptFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    
    const request = await FriendRequest.findById(requestId);
    if (!request) {
        throw new ApiError(404, "Friend request not found");
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to accept this request");
    }

    if (request.status !== "PENDING") {
        throw new ApiError(400, "Request is already processed");
    }

    request.status = "ACCEPTED";
    await request.save();

    // Add to Neo4j graph
    try {
        await addFriend(request.sender, request.receiver);
    } catch (err) {
        console.warn("Failed to add friend to Neo4j (graph down):", err.message);
    }

    // Create Notification for the sender
    await Notification.create({
        recipient: request.sender,
        sender: request.receiver,
        type: 'FRIEND_ACCEPT',
        message: 'accepted your friend request.'
    });

    return res.status(200).json(new ApiResponse(200, request, "Friend request accepted"));
});

const rejectFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    
    const request = await FriendRequest.findById(requestId);
    if (!request) {
        throw new ApiError(404, "Friend request not found");
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to reject this request");
    }

    if (request.status !== "PENDING") {
        throw new ApiError(400, "Request is already processed");
    }

    request.status = "REJECTED";
    await request.save();

    return res.status(200).json(new ApiResponse(200, request, "Friend request rejected"));
});

const cancelFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    
    const request = await FriendRequest.findById(requestId);
    if (!request) {
        throw new ApiError(404, "Friend request not found");
    }

    if (request.sender.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only cancel your own requests");
    }

    await FriendRequest.findByIdAndDelete(requestId);

    return res.status(200).json(new ApiResponse(200, {}, "Friend request cancelled"));
});

const removeFriendHandler = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Delete in MongoDB
    await FriendRequest.findOneAndDelete({
        $or: [
            { sender: currentUserId, receiver: userId },
            { sender: userId, receiver: currentUserId }
        ],
        status: "ACCEPTED"
    });

    // Remove from Neo4j
    try {
        await removeFriend(currentUserId, userId);
    } catch (err) {
        console.warn("Failed to remove friend from Neo4j (graph down):", err.message);
    }

    return res.status(200).json(new ApiResponse(200, {}, "Friend removed"));
});

const getFriends = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;

    let friendIds = [];
    try {
        // Fetching from Neo4j as it's the graph source of truth.
        const cypher = `
            MATCH (u:User {mongoId: $userId})-[:FRIEND]-(friend:User)
            RETURN DISTINCT friend.mongoId AS friendId
        `;
        const result = await readQuery(cypher, { userId: currentUserId.toString() });
        friendIds = result ? result.map(record => record.get('friendId')) : [];
    } catch (err) {
        console.error("Neo4j getFriends failed, falling back to MongoDB:", err.message);
        const friendships = await FriendRequest.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }],
            status: "ACCEPTED"
        });
        
        friendIds = friendships.map(f => 
            f.sender.toString() === currentUserId.toString() ? f.receiver : f.sender
        );
    }
    
    const friends = await User.find({ _id: { $in: friendIds } }).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, friends, "Friends fetched successfully"));
});

const getFriendRequests = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;

    const requests = await FriendRequest.find({
        receiver: currentUserId,
        status: "PENDING"
    }).populate("sender", "username fullName avatar");

    return res.status(200).json(new ApiResponse(200, requests, "Friend requests fetched successfully"));
});

const getUserFriends = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    let friends = [];
    try {
        const cypher = `
            MATCH (u:User {mongoId: $userId})-[:FRIEND]-(friend:User)
            RETURN DISTINCT friend.mongoId AS friendId
        `;
        const result = await readQuery(cypher, { userId: id.toString() });
        
        const friendIds = result ? result.map(record => record.get('friendId')) : [];
        friends = await User.find({ _id: { $in: friendIds } }).select("-password -refreshToken");
    } catch (err) {
        console.warn("Neo4j getUserFriends failed, graph down:", err.message);
    }

    return res.status(200).json(new ApiResponse(200, friends, "User friends fetched successfully"));
});

const getUserFollowers = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const followers = await Subscription.find({ channel: id }).populate("subscriber", "username fullName avatar");
    
    return res.status(200).json(new ApiResponse(200, followers, "User followers fetched successfully"));
});

const getUserFollowing = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const following = await Subscription.find({ subscriber: id }).populate("channel", "username fullName avatar");
    
    return res.status(200).json(new ApiResponse(200, following, "User following fetched successfully"));
});

const getMutualFriends = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user._id;

    let mutualFriends = [];
    try {
        const cypher = `
            MATCH (u1:User {mongoId: $user1})-[:FRIEND]-(mutual:User)-[:FRIEND]-(u2:User {mongoId: $user2})
            WHERE mutual.mongoId <> $user1 AND mutual.mongoId <> $user2
            RETURN DISTINCT mutual.mongoId AS mutualId
        `;
        const result = await readQuery(cypher, { 
            user1: currentUserId.toString(), 
            user2: id.toString() 
        });

        const mutualIds = result ? result.map(record => record.get('mutualId')) : [];
        mutualFriends = await User.find({ _id: { $in: mutualIds } }).select("-password -refreshToken");
    } catch (err) {
        console.warn("Neo4j getMutualFriends failed, graph down:", err.message);
    }

    return res.status(200).json(new ApiResponse(200, mutualFriends, "Mutual friends fetched successfully"));
});

const getConnectionPath = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user._id;

    let path = [];
    try {
        path = await findShortestPathBfs(currentUserId, id);
    } catch (err) {
        console.warn("Neo4j getConnectionPath failed, graph down:", err.message);
    }

    if (!path) {
        return res.status(200).json(new ApiResponse(200, { path: [] }, "No connection path found"));
    }

    // Populate user details for the path
    const usersInPath = await User.find({ _id: { $in: path } }).select("username fullName avatar");
    
    // Sort array to match graph path order
    const sortedPath = path.map(nodeId => usersInPath.find(u => u._id.toString() === nodeId.toString()));

    return res.status(200).json(new ApiResponse(200, { path: sortedPath }, "Connection path fetched successfully"));
});

export {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriendHandler,
    getFriends,
    getFriendRequests,
    getUserFriends,
    getUserFollowers,
    getUserFollowing,
    getMutualFriends,
    getConnectionPath
};
