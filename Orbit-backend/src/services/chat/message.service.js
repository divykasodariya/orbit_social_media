import mongoose from "mongoose";
import { Message } from "../../models/message.model.js";
import { FriendRequest } from "../../models/friendRequest.model.js";

// Check whether two users are friends
const areFriends = async (userId, friendId) => {
    const friendship = await FriendRequest.exists({
        status: "ACCEPTED",
        $or: [
            { sender: userId, receiver: friendId },
            { sender: friendId, receiver: userId }
        ]
    });

    return !!friendship;
};

// Send a message
export const sendMessageService = async (senderId, receiverId, content) => {

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
        throw new Error("Invalid receiver ID");
    }

    if (senderId.toString() === receiverId.toString()) {
        throw new Error("You cannot send a message to yourself");
    }

    if (!content || !content.trim()) {
        throw new Error("Message cannot be empty");
    }

    if (content.trim().length > 5000) {
        throw new Error("Message cannot exceed 5000 characters");
    }

    const isFriend = await areFriends(senderId, receiverId);

    if (!isFriend) {
        throw new Error("You can only message your friends");
    }

    const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        content: content.trim()
    });

    return message;
};


// Fetch conversation between two users
export const getMessagesService = async (userId, friendId) => {

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
        throw new Error("Invalid friend ID");
    }

    if (userId.toString() === friendId.toString()) {
        throw new Error("Invalid conversation");
    }

    const isFriend = await areFriends(userId, friendId);

    if (!isFriend) {
        throw new Error("You can only view conversations with your friends");
    }

    const messages = await Message.find({
        $or: [
            { sender: userId, receiver: friendId },
            { sender: friendId, receiver: userId }
        ]
    })
        .sort({ createdAt: 1 })
        .lean();

    return messages;
};