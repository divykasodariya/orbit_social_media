import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const threadSchema = new Schema(
    {
        communityId: {
            type: Schema.Types.ObjectId,
            ref: "Community",
            required: true,
        },
        authorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300,
        },
        body: {
            type: String,
            trim: true,
        },
        media: {
            type: String, // optional image/video
        },
        flair: {
            type: String,
            trim: true,
        },
        score: {
            type: Number,
            default: 0,
            index: true,
        },
        commentCount: {
            type: Number,
            default: 0,
        },
        isModeratorRemoved: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for sorting
threadSchema.index({ communityId: 1, createdAt: -1 });
threadSchema.index({ communityId: 1, score: -1 });

threadSchema.plugin(mongooseAggregatePaginate);

export const Thread = mongoose.model("Thread", threadSchema);
