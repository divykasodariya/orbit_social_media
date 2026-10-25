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

    // 🧠 Timestamped transcript segments (for RAG chatbot & interactive transcript)
    segments: {
      type: [
        {
          start: { type: Number, required: true },
          end: { type: Number, required: true },
          text: { type: String, required: true },
        },
      ],
      default: [],
    },

    // 🤖 AI Summary, Key Points & Chapters (Groq Llama 3.3)
    aiAnalysis: {
      tldr: { type: String, default: null },
      keyPoints: { type: [String], default: [] },
      chapters: {
        type: [
          {
            timestamp: { type: Number, required: true },
            formattedTime: { type: String, required: true },
            title: { type: String, required: true },
          },
        ],
        default: [],
      },
      analysisStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
      },
    },

    // ⚠️ AI Advisory: Unverified Medical / Financial / Legal Claims
    aiAdvisory: {
      hasAdvisory: { type: Boolean, default: false },
      category: {
        type: String,
        enum: ["medical", "financial", "legal", "none"],
        default: "none",
      },
      riskLevel: {
        type: String,
        enum: ["high", "medium", "low", "none"],
        default: "none",
      },
      disclaimerTitle: { type: String, default: null },
      disclaimerMessage: { type: String, default: null },
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);