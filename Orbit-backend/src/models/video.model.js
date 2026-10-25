import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String,
      required: true,
    },

    thumbnail: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },

    // ✅ NUMBER
    views: {
      type: Number,
      default: 0,
    },

    // ✅ UNIQUE VIEW TRACKING
    viewedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isPublished: {
      type: Boolean,
      default: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🎙️ AI Transcription & Subtitles (Groq Whisper)
    transcript: {
      type: String,
      default: null,
    },
    caption_vtt: {
      type: String,
      default: null,
    },
    transcription_status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    transcription_error: {
      type: String,
      default: null,
    },

    // 🛡️ Toxicity, Vulgarity & Shadow Banning (Llama 3.3)
    isShadowBanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    toxicityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    isVulgar: {
      type: Boolean,
      default: false,
    },
    flaggedCategories: {
      type: [String],
      default: [],
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    moderationError: {
      type: String,
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);