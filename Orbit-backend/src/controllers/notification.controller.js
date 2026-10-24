import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc Get all notifications for the current user
// @route GET /api/v1/notifications
const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const notifications = await Notification.find({ recipient: userId })
        .populate("sender", "fullName username avatar")
        .sort({ createdAt: -1 })
        .limit(50); // Get latest 50 notifications

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json(
        new ApiResponse(
            200, 
            { notifications, unreadCount }, 
            "Notifications fetched successfully"
        )
    );
});

// @desc Mark a specific notification as read
// @route PATCH /api/v1/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
        { _id: id, recipient: userId },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    return res.status(200).json(
        new ApiResponse(200, notification, "Notification marked as read")
    );
});

// @desc Mark all notifications as read
// @route PATCH /api/v1/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "All notifications marked as read")
    );
});

export {
    getNotifications,
    markAsRead,
    markAllAsRead
};
