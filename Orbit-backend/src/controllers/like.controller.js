import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { Notification } from "../models/notification.model.js";

/* ======================================================
   VIDEO LIKE
====================================================== */
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId
  });

  let isLiked;

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    isLiked = false;
  } else {
    await Like.create({
      video: videoId,
      likedBy: userId
    });
    isLiked = true;

    // Create Notification
    if (video.owner.toString() !== userId.toString()) {
        await Notification.create({
            recipient: video.owner,
            sender: userId,
            type: 'LIKE',
            entityId: videoId,
            entityModel: 'Video',
            message: 'liked your video.'
        });
    }
  }

  const likesCount = await Like.countDocuments({ video: videoId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked,
        likesCount
      },
      "Video like toggled successfully"
    )
  );
});

/* ======================================================
   TWEET LIKE
====================================================== */
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId
  });

  let isLiked;

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    isLiked = false;
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: userId
    });
    isLiked = true;

    // Create Notification
    if (tweet.owner.toString() !== userId.toString()) {
        await Notification.create({
            recipient: tweet.owner,
            sender: userId,
            type: 'LIKE',
            entityId: tweetId,
            entityModel: 'Tweet',
            message: 'liked your post.'
        });
    }
  }

  const likesCount = await Like.countDocuments({ tweet: tweetId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked,
        likesCount
      },
      "Tweet like toggled successfully"
    )
  );
});

/* ======================================================
   COMMENT LIKE
====================================================== */
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId
  });

  let isLiked;

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    isLiked = false;
  } else {
    await Like.create({
      comment: commentId,
      likedBy: userId
    });
    isLiked = true;
  }

  const likesCount = await Like.countDocuments({ comment: commentId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked,
        likesCount
      },
      "Comment like toggled successfully"
    )
  );
});

/* ======================================================
   GET LIKED VIDEOS (FOR LIBRARY / LIKES PAGE)
====================================================== */
const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $exists: true }
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video"
      }
    },
    { $unwind: "$video" },
    {
      $lookup: {
        from: "users",
        localField: "video.owner",
        foreignField: "_id",
        as: "channel"
      }
    },
    { $unwind: "$channel" },
    {
      $project: {
        _id: 0,
        likedAt: "$createdAt",
        video: {
          _id: "$video._id",
          title: "$video.title",
          thumbnail: "$video.thumbnail",
          duration: "$video.duration",
          views: "$video.views",
          createdAt: "$video.createdAt"
        },
        channel: {
          _id: "$channel._id",
          username: "$channel.username",
          avatar: "$channel.avatar"
        }
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      likedVideos,
      "All liked videos fetched successfully"
    )
  );
});

export {
  toggleVideoLike,
  toggleTweetLike,
  toggleCommentLike,
  getLikedVideos
};




























// import mongoose, {isValidObjectId} from "mongoose";
// import {ApiError} from "../utils/ApiError.js"
// import {asyncHandler} from "../utils/asyncHandler.js"
// import {ApiResponse} from "../utils/ApiResponse.js"
// import { Like } from "../models/like.model.js";
// import { Video } from "../models/video.model.js";
// import {Tweet} from "../models/tweet.model.js"
// import {Comment} from "../models/comment.model.js"

// const toggleVideoLike = asyncHandler(async (req, res) => {
//     const { videoId } = req.params
//     const userId = req.user._id

//     if (!isValidObjectId(videoId)) {
//         throw new ApiError(400, "Invalid Video Id")
//     }

//     const video = await Video.findById(videoId)
//     if (!video) {
//         throw new ApiError(404, "Video not found")
//     }

//     // 🔁 Atomic toggle
//     const deletedLike = await Like.findOneAndDelete({
//         video: videoId,
//         likedBy: userId
//     })

//     if (!deletedLike) {
//         const like = await Like.create({
//             video: videoId,
//             likedBy: userId
//         })

//         return res.status(201).json(
//             new ApiResponse(201, like, "Video liked successfully")
//         )
//     }

//     return res.status(200).json(
//         new ApiResponse(200, null, "Video unliked successfully")
//     )
// })

// const toggleTweetLike = asyncHandler(async (req, res) => {
//     const { tweetId } = req.params
//     const userId = req.user._id

//     if (!isValidObjectId(tweetId)) {
//         throw new ApiError(400, "Invalid Tweet Id")
//     }

//     const tweet = await Tweet.findById(tweetId)
//     if (!tweet) {
//         throw new ApiError(404, "Tweet not found")
//     }

//     // 🔁 Atomic toggle
//     const deletedLike = await Like.findOneAndDelete({
//         tweet: tweetId,
//         likedBy: userId
//     })

//     if (!deletedLike) {
//         const like = await Like.create({
//             tweet: tweetId,
//             likedBy: userId
//         })

//         return res.status(201).json(
//             new ApiResponse(201, like, "Tweet liked successfully")
//         )
//     }

//     return res.status(200).json(
//         new ApiResponse(200, null, "Tweet unliked successfully")
//     )
// })

// const toggleCommentLike = asyncHandler(async (req, res) => {
//     const { commentId } = req.params
//     const userId = req.user._id

//     if (!isValidObjectId(commentId)) {
//         throw new ApiError(400, "Invalid Comment Id")
//     }

//     const comment = await Comment.findById(commentId)
//     if (!comment) {
//         throw new ApiError(404, "Comment not found")
//     }

//     // 🔁 Atomic toggle
//     const deletedLike = await Like.findOneAndDelete({
//         comment: commentId,
//         likedBy: userId
//     })

//     if (!deletedLike) {
//         const like = await Like.create({
//             comment: commentId,
//             likedBy: userId
//         })

//         return res.status(201).json(
//             new ApiResponse(201, like, "Comment liked successfully")
//         )
//     }

//     return res.status(200).json(
//         new ApiResponse(200, null, "Comment unliked successfully")
//     )
// })

// const getLikedVideos = asyncHandler(async (req, res) => {
//     const userId = req.user._id

//     const likedVideos = await Like.aggregate([
//         {
//             $match: {
//                 likedBy: new mongoose.Types.ObjectId(userId),
//                 video: { $exists: true }
//             }
//         },
//         {
//             $lookup: {
//                 from: "videos",
//                 localField: "video",
//                 foreignField: "_id",
//                 as: "video"
//             }
//         },
//         { $unwind: "$video" },
//         {
//             $lookup: {
//                 from: "users",
//                 localField: "video.owner",
//                 foreignField: "_id",
//                 as: "channel"
//             }
//         },
//         { $unwind: "$channel" },
//         {
//             $project: {
//                 _id: 0,
//                 likedAt: "$createdAt",
//                 video: {
//                     _id: "$video._id",
//                     title: "$video.title",
//                     thumbnail: "$video.thumbnail",
//                     duration: "$video.duration",
//                     views: "$video.views",
//                     createdAt: "$video.createdAt"
//                 },
//                 channel: {
//                     _id: "$channel._id",
//                     username: "$channel.username",
//                     avatar: "$channel.avatar"
//                 }
//             }
//         }
//     ])

//     return res.status(200).json(
//         new ApiResponse(200, likedVideos, "All liked videos fetched successfully")
//     )
// })


// export {
//     toggleVideoLike,
//     toggleTweetLike,
//     toggleCommentLike,
//     getLikedVideos
// }



