import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const communityMembershipSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        communityId: {
            type: Schema.Types.ObjectId,
            ref: "Community",
            required: true,
        },
        role: {
            type: String,
            enum: ["OWNER", "MODERATOR", "MEMBER"],
            default: "MEMBER",
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED"],
            default: "APPROVED",
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate memberships
communityMembershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });

communityMembershipSchema.plugin(mongooseAggregatePaginate);

export const CommunityMembership = mongoose.model("CommunityMembership", communityMembershipSchema);
