import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
    {
        reporter: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        targetType: {
            type: String,
            enum: ["THREAD", "COMMENT"],
            required: true,
        },
        targetId: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'targetTypeModel'
        },
        targetTypeModel: {
            type: String,
            required: true,
            enum: ["Thread", "Comment"]
        },
        communityId: {
            type: Schema.Types.ObjectId,
            ref: "Community",
        },
        status: {
            type: String,
            enum: ["PENDING", "RESOLVED", "DISMISSED"],
            default: "PENDING",
        },
    },
    {
        timestamps: true,
    }
);

export const Report = mongoose.model("Report", reportSchema);
