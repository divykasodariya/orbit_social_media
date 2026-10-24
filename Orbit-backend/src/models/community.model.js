import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const communitySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        rules: {
            type: [String],
            default: [],
        },
        avatar: {
            type: String, // Cloudinary URL
            default: "",
        },
        banner: {
            type: String, // Cloudinary URL
            default: "",
        },
        creator: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        privacy: {
            type: String,
            enum: ["PUBLIC", "PRIVATE"],
            default: "PUBLIC",
            required: true,
        },
        memberCount: {
            type: Number,
            default: 1, // Creator is the first member
        },
    },
    {
        timestamps: true,
    }
);

communitySchema.plugin(mongooseAggregatePaginate);

export const Community = mongoose.model("Community", communitySchema);
