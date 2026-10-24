// import mongoose, { isValidObjectId } from "mongoose";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { Tweet } from "../models/tweet.model.js";

// /* ================= CREATE TWEET ================= */
// const createTweet = asyncHandler(async (req, res) => {
//   const { content } = req.body;

//   if (!content?.trim()) {
//     throw new ApiError(400, "Content is required");
//   }

//   const tweet = await Tweet.create({
//     content,
//     owner: req.user._id,
//   });

//   return res.status(201).json(
//     new ApiResponse(201, tweet, "Tweet created successfully")
//   );
// });

// /* ================= GET ALL TWEETS (🔥 FIX) ================= */
// // const getAllTweets = asyncHandler(async (req, res) => {
// //   const tweets = await Tweet.find()
// //     .sort({ createdAt: -1 }) // latest first
// //     .populate("owner", "username avatar fullName");

// //   return res.status(200).json(
// //     new ApiResponse(200, tweets, "All tweets fetched successfully")
// //   );
// // });

// // const getAllTweets = asyncHandler(async (req, res) => {
// //   // ✅ SAFE: user may or may not be logged in
// //   const userId = req.user?._id
// //     ? new mongoose.Types.ObjectId(req.user._id)
// //     : null;

// //   const tweets = await Tweet.aggregate([
// //     { $sort: { createdAt: -1 } },

// //     {
// //       $lookup: {
// //         from: "users",
// //         localField: "owner",
// //         foreignField: "_id",
// //         as: "owner"
// //       }
// //     },
// //     { $unwind: "$owner" },

// //     {
// //       $lookup: {
// //         from: "likes",
// //         let: { tweetId: "$_id" },
// //         pipeline: [
// //           {
// //             $match: {
// //               $expr: {
// //                 $eq: ["$tweet", "$$tweetId"]
// //               }
// //             }
// //           }
// //         ],
// //         as: "likes"
// //       }
// //     },

// //     {
// //       $addFields: {
// //         likesCount: { $size: "$likes" },

// //         // ✅ SAFE isLiked check
// //         isLiked: userId
// //           ? { $in: [userId, "$likes.likedBy"] }
// //           : false
// //       }
// //     },

// //     {
// //       $project: {
// //         content: 1,
// //         createdAt: 1,
// //         likesCount: 1,
// //         isLiked: 1,
// //         owner: {
// //           _id: "$owner._id",
// //           username: "$owner.username",
// //           avatar: "$owner.avatar",
// //           fullName: "$owner.fullName"
// //         }
// //       }
// //     }
// //   ]);

// //   return res.status(200).json(
// //     new ApiResponse(200, tweets, "All tweets fetched successfully")
// //   );
// // });

// const getAllTweets = asyncHandler(async (req, res) => {
//   // ✅ SAFE: user may or may not be logged in
//   const userId = req.user?._id
//     ? new mongoose.Types.ObjectId(req.user._id)
//     : null;

//   const tweets = await Tweet.aggregate([
//     { $sort: { createdAt: -1 } },

//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "owner"
//       }
//     },
//     { $unwind: "$owner" },

//     {
//       $lookup: {
//         from: "likes",
//         let: { tweetId: "$_id" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $eq: ["$tweet", "$$tweetId"]
//               }
//             }
//           }
//         ],
//         as: "likes"
//       }
//     },

//     {
//       $addFields: {
//         likesCount: { $size: "$likes" },
//         isLiked: userId
//           ? { $in: [userId, "$likes.likedBy"] }
//           : false
//       }
//     },

//     {
//       $project: {
//         content: 1,
//         createdAt: 1,
//         likesCount: 1,
//         isLiked: 1,
//         owner: {
//           _id: "$owner._id",
//           username: "$owner.username",
//           avatar: "$owner.avatar",
//           fullName: "$owner.fullName"
//         }
//       }
//     }
//   ]);

//   return res.status(200).json(
//     new ApiResponse(200, tweets, "All tweets fetched successfully")
//   );
// });

// /* ================= GET USER TWEETS ================= */
// const getUserTweet = asyncHandler(async (req, res) => {
//   const { userId } = req.params;

//   if (!isValidObjectId(userId)) {
//     throw new ApiError(400, "Invalid user id");
//   }

//   const tweets = await Tweet.find({ owner: userId })
//     .sort({ createdAt: -1 })
//     .populate("owner", "username avatar fullName");

//   return res.status(200).json(
//     new ApiResponse(200, tweets, "User tweets fetched successfully")
//   );
// });

// /* ================= UPDATE TWEET ================= */
// const updateTweet = asyncHandler(async (req, res) => {
//   const { tweetId } = req.params;
//   const { content } = req.body;

//   if (!content?.trim()) {
//     throw new ApiError(400, "Content is required");
//   }

//   const tweet = await Tweet.findOneAndUpdate(
//     { _id: tweetId, owner: req.user._id },
//     { content },
//     { new: true }
//   );

//   if (!tweet) {
//     throw new ApiError(404, "Tweet not found or unauthorized");
//   }

//   return res.status(200).json(
//     new ApiResponse(200, tweet, "Tweet updated successfully")
//   );
// });

// /* ================= DELETE TWEET ================= */
// const deleteTweet = asyncHandler(async (req, res) => {
//   const { tweetId } = req.params;

//   const tweet = await Tweet.findOneAndDelete({
//     _id: tweetId,
//     owner: req.user._id,
//   });

//   if (!tweet) {
//     throw new ApiError(404, "Tweet not found or unauthorized");
//   }

//   return res.status(200).json(
//     new ApiResponse(200, tweet, "Tweet deleted successfully")
//   );
// });

// export {
//   createTweet,
//   getAllTweets,     // 🔥 EXPORT
//   getUserTweet,
//   updateTweet,
//   deleteTweet,
// };






import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

/* ================= CREATE TWEET ================= */
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  let imageUrl = "";
  if (req.file?.path) {
    const uploadedImage = await uploadOnCloudinary(req.file.path);
    if (uploadedImage?.url) {
      imageUrl = uploadedImage.url;
    }
  }

  const tweet = await Tweet.create({
    content,
    image: imageUrl || undefined,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

/* ================= GET ALL TWEETS ================= */
// const getAllTweets = asyncHandler(async (req, res) => {
//   const userId = req.user?._id
//     ? new mongoose.Types.ObjectId(req.user._id)
//     : null;

//   const tweets = await Tweet.aggregate([
//     { $sort: { createdAt: -1 } },

//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "owner",
//       },
//     },
//     { $unwind: "$owner" },

//     {
//       $lookup: {
//         from: "likes",
//         let: { tweetId: "$_id" },
//         pipeline: [
//           {
//             $match: {
//               $expr: { $eq: ["$tweet", "$$tweetId"] },
//             },
//           },
//         ],
//         as: "likes",
//       },
//     },

//     {
//       $addFields: {
//         likesCount: { $size: "$likes" },
//         isLiked: userId
//           ? { $in: [userId, "$likes.likedBy"] }
//           : false,
//       },
//     },

//     {
//       $project: {
//         content: 1,
//         createdAt: 1,
//         likesCount: 1,
//         isLiked: 1,
//         owner: {
//           _id: "$owner._id",
//           username: "$owner.username",
//           avatar: "$owner.avatar",
//           fullName: "$owner.fullName",
//         },
//       },
//     },
//   ]);

//   return res
//     .status(200)
//     .json(new ApiResponse(200, tweets, "All tweets fetched successfully"));
// });

const getAllTweets = asyncHandler(async (req, res) => {
  const userId = req.user?._id
    ? new mongoose.Types.ObjectId(req.user._id)
    : null;

  const tweets = await Tweet.aggregate([
    { $sort: { createdAt: -1 } },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },

    {
      $lookup: {
        from: "likes",
        let: { tweetId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$tweet", "$$tweetId"] },
            },
          },
        ],
        as: "likes",
      },
    },

    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: userId
          ? { $in: [userId, "$likes.likedBy"] }
          : false,
      },
    },

    {
      $project: {
        content: 1,
        image: 1,
        createdAt: 1,
        likesCount: 1,
        isLiked: 1,
        owner: {
          _id: "$owner._id",
          username: "$owner.username",
          avatar: "$owner.avatar",
          fullName: "$owner.fullName",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "All tweets fetched successfully"));
});

/* ================= GET USER TWEETS (🔥 FIXED) ================= */
const getUserTweet = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const loggedInUserId = req.user?._id
    ? new mongoose.Types.ObjectId(req.user._id)
    : null;

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },

    { $sort: { createdAt: -1 } },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },

    {
      $lookup: {
        from: "likes",
        let: { tweetId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$tweet", "$$tweetId"] },
            },
          },
        ],
        as: "likes",
      },
    },

    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: loggedInUserId
          ? { $in: [loggedInUserId, "$likes.likedBy"] }
          : false,
      },
    },

    {
      $project: {
        content: 1,
        image: 1,
        createdAt: 1,
        likesCount: 1,
        isLiked: 1,
        owner: {
          _id: "$owner._id",
          username: "$owner.username",
          avatar: "$owner.avatar",
          fullName: "$owner.fullName",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

/* ================= UPDATE TWEET ================= */
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.findOneAndUpdate(
    { _id: tweetId, owner: req.user._id },
    { content },
    { new: true }
  );

  if (!tweet) {
    throw new ApiError(404, "Tweet not found or unauthorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

/* ================= DELETE TWEET ================= */
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const tweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: req.user._id,
  });

  if (!tweet) {
    throw new ApiError(404, "Tweet not found or unauthorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet deleted successfully"));
});

export {
  createTweet,
  getAllTweets,
  getUserTweet,
  updateTweet,
  deleteTweet,
};