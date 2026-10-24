import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ["FRIEND_REQUEST", "FRIEND_ACCEPT", "LIKE", "COMMENT", "SUBSCRIBE", "COMMUNITY_JOIN", "NEW_POST"],
            required: true
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: false // Optional, depends on the type
        },
        entityModel: {
            type: String,
            required: false // Optional
        },
        message: {
            type: String,
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export const Notification = mongoose.model("Notification", notificationSchema);
