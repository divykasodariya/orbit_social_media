import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        thread: {
            type: Schema.Types.ObjectId,
            ref: "Thread"
        },
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        },
        isModeratorRemoved: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
)

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)