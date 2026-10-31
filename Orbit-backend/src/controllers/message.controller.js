import {
    sendMessageService,
    getMessagesService
} from "../services/chat/message.service.js";

// Send message
export const sendMessage = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { friendId } = req.params;
        const { content } = req.body;

        const message = await sendMessageService(
            senderId,
            friendId,
            content
        );

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: message
        });

    } catch (error) {
        console.error("Send message error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Failed to send message"
        });
    }
};


// Get conversation
export const getMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { friendId } = req.params;

        const messages = await getMessagesService(
            userId,
            friendId
        );

        return res.status(200).json({
            success: true,
            data: messages
        });

    } catch (error) {
        console.error("Get messages error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch messages"
        });
    }
};