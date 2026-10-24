import mongoose, { Schema } from "mongoose";

const threadVoteSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        threadId: {
            type: Schema.Types.ObjectId,
            ref: "Thread",
            required: true,
        },
        value: {
            type: Number,
            enum: [1, -1],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure one active vote per user per thread
threadVoteSchema.index({ userId: 1, threadId: 1 }, { unique: true });

export const ThreadVote = mongoose.model("ThreadVote", threadVoteSchema);
