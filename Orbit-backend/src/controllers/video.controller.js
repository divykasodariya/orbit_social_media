import mongoose, {isValidObjectId} from "mongoose";
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { uploadOnCloudinary, /*deleteOnCloudinary*/ } from "../utils/cloudinary.js"
// import { use } from "react";


// const getAllVideos = asyncHandler(async (req, res) => {
//     const {page=1, limit=10, query="", sortBy="createdAt", sortType="desc"} = req.query

//     const pageNumber = parseInt(page)
//     const limitNumber = parseInt(limit)
//     const sortDirection = sortType === "asc" ? 1 : -1

//     const matchStage = query 
//         ? {title: {$regex: query, $options: "i"}}
//         : {};

//     const sortStage = {
//         [sortBy] : sortDirection
//     }

//     const aggregatePipeline = [
//         {
//             $match: matchStage
//         },
//         {
//             $sort: sortStage
//         },
//         {
//             $lookup: {
//                 from: "users",
//                 localField: "owner",
//                 foreignField: "_id",
//                 as: "channel"
//             }
//         },
//         {
//             $unwind: "$channel"
//         },
//         {
//             $project: {
//                 _id: 1,
//                 thumbnail: 1,
//                 title: 1,
//                 duration: 1,
//                 views: {
//                     $cond: {
//                         if: {$isArray: "$views"},
//                         then: {$size: "$views"},
//                         else: {$ifNull: ["$views", 0]}
//                     }
//                 },
//                 isPublished: 1,
//                 "channel._id": 1,
//                 "channel.username": 1,
//                 "channel.avatar": 1,
//                 createdAt: 1,
//                 updatedAt: 1
//             }
//         }
//     ];

//     const options = {
//         page: pageNumber,
//         limit: limitNumber
//     }

//     const aggregate = Video.aggregate(aggregatePipeline)

//     Video.aggregatePaging(aggregate, options, (err, result) => {
//         if(err){
//             throw new ApiError(400, err.message || "Failed to fetch videos")
//         }
//         else{
//             return res
//             .status(200)
//             .json(
//                 new ApiResponse(200, result, "All videos Fetched Successfully")
//             )
//         }
//     })

// })

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc"
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const sortDirection = sortType === "asc" ? 1 : -1;

    const matchStage = {
        isPublished: true,
        ...(query && {
            title: { $regex: query, $options: "i" }
        })
    };

    const sortStage = {
        [sortBy]: sortDirection
    };

    const aggregatePipeline = [
        { $match: matchStage },
        { $sort: sortStage },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: "$channel" },
        {
            $project: {
                _id: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                "channel._id": 1,
                "channel.username": 1,
                "channel.avatar": 1,
                "channel.fullName": 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ];

    const options = {
        page: pageNumber,
        limit: limitNumber
    };

    const aggregate = Video.aggregate(aggregatePipeline);
    const result = await Video.aggregatePaginate(aggregate, options);

    return res.status(200).json(
        new ApiResponse(200, result, "All videos fetched successfully")
    );
});

// const getAllUserVideos = asyncHandler(async (req, res) => {
//     let {page=1, limit=10, query, sortBy="createdAt", sortType="desc", userId} = req.query

//     if(!userId){
//         throw new ApiError(404, "User id is required")
//     }

//     if(!isValidObjectId(userId)){
//         throw new ApiError(400, "Invalid User")
//     }

//     page = parseInt(page)
//     limit = parseInt(limit)

//     const myAggregateVideos = Video.aggregate([
//         {
//             $match: {
//                 owner: new mongoose.Types.ObjectId(userId)
//             }
//         },
//         {
//             $lookup: {
//                 from: "users",
//                 localField: "owner",
//                 foreignField: "_id",
//                 as: "channel"
//             }
//         },
//         {
//             $unwind: "$channel"
//         },
//         {
//             $match: {
//                 ...(query && {title: { $regex: query, $options: "i"}})
//             }
//         },
//         {
//             $sort: {
//                 [sortBy]: sortType === "asc" ? 1 : -1
//             }
//         },
//         {
//             $skip: (page - 1) * limit
//         },
//         {
//             $limit: limit
//         },
//         {
//             $addFields: {
//                 views: {
//                     $cond: {
//                         if: {isArray: "$views"},
//                         then: {$size: "$views"},
//                         else: { $isNull: ["$views", 0]}
//                     }
//                 }
//             }
//         },
//         {
//             $project: {
//                 "channel.email": 0,
//                 "channel.password": 0,
//                 "channel.refreshToken": 0,
//                 "channel.updatedAt": 0
//             }
//         }
//     ])

//     const result = await Video.aggregatePaginate(myAggregateVideos, {page, limit})

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, result, "All User Videos with channel Info")
//     )
// })

const getAllUserVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query;

    if (!userId) {
        throw new ApiError(400, "User id is required");
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User");
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const matchStage = {
        owner: new mongoose.Types.ObjectId(userId),
        ...(query && {
            title: { $regex: query, $options: "i" }
        })
    };

    const sortStage = {
        [sortBy]: sortType === "asc" ? 1 : -1
    };

    const aggregate = Video.aggregate([
        { $match: matchStage },
        { $sort: sortStage },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: "$channel" },
        {
            $project: {
                "channel.password": 0,
                "channel.refreshToken": 0,
                "channel.email": 0,
                "channel.updatedAt": 0
            }
        }
    ]);

    const result = await Video.aggregatePaginate(aggregate, {
        page: pageNumber,
        limit: limitNumber
    });

    return res.status(200).json(
        new ApiResponse(200, result, "All user videos fetched successfully")
    );
});

// const publishVideo = asyncHandler(async (req, res) => {
//     const {title, description} = req.body

//     //TODO: get video, upload on cloudinary, create video 

//     /*
//         1. get the thumbnail and videoFile name from multer
//         2. then, take the fielPath and send it to cloudinary
//         3. extract the duration from the cloudinary output
//         4. take the userId as owner 
//         5. Ignore for now: duration, views, isPublished
//         6. extract the duration from the cloudinary output
//         7. save all videoFile, thumbnail, owner, title, description
//     */

//     if(!(title || description)){
//         throw new ApiError(404, "Title or description is Invalid")
//     }

//     const videoLocalPath = req.files?.videoFile[0]?.path
//     if(!videoLocalPath){
//         throw new ApiError(400, "Video path is required")
//     }

//     let thumbnailLocalPath;
//     if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
//         thumbnailLocalPath = req.files?.thumbnail[0].path
//     }

//     const videoFile = await uploadOnCloudinary(videoLocalPath)
//     const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

//     if(!(videoFile || thumbnail)){
//         throw new ApiError(400, "Error while uploading video and thumbnail file on cloudinary")
//     }

//     const video = await Video.create({
//         videoFile: videoFile.url,
//         thumbnail: thumbnail.url,
//         owner: req.user._id,
//         description,
//         duration: videoFile.duration
//     })
//     await video.save()

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, video, "Video published successfully")
//     )
// })

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    // 1️⃣ Validate inputs
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    // 2️⃣ Get video file
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required");
    }

    // 3️⃣ Get thumbnail file
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    // 4️⃣ Upload to Cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile || !thumbnail) {
        throw new ApiError(400, "Error uploading files to Cloudinary");
    }

    // 5️⃣ Save video in DB
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: videoFile.duration,
        owner: req.user._id
    });

    // 6️⃣ Send response
    return res.status(201).json(
        new ApiResponse(201, video, "Video published successfully")
    );
});


// const getVideoById = asyncHandler(async (req, res) => {
//   const { videoId } = req.params;

//   if (!isValidObjectId(videoId)) {
//     throw new ApiError(400, "Invalid video id");
//   }

//   const video = await Video.findById(videoId)
//     .populate("owner", "username avatar fullName");

//   if (!video) {
//     throw new ApiError(404, "Video not found");
//   }

//   /* ================= VIEW COUNT ================= */
//   if (req.user?._id) {
//     const userId = req.user._id.toString();

//     // ✅ SAFE CHECK (NO CRASH)
//     const viewedBy = Array.isArray(video.viewedBy) ? video.viewedBy : [];

//     const alreadyViewed = viewedBy.some(
//       (id) => id.toString() === userId
//     );

//     if (!alreadyViewed) {
//       video.views += 1;

//       // only push if field exists
//       if (Array.isArray(video.viewedBy)) {
//         video.viewedBy.push(req.user._id);
//       }

//       await video.save();
//     }

//     /* ================= WATCH HISTORY (FIX) ================= */
//     await User.updateOne(
//       { _id: req.user._id },
//       { $pull: { watchHistory: video._id } }
//     );

//     await User.updateOne(
//       { _id: req.user._id },
//       {
//         $push: {
//           watchHistory: {
//             $each: [video._id],
//             $position: 0
//           }
//         }
//       }
//     );
//   }

//   /* ================= LIKES / SUBSCRIBE ================= */
//   const Like = mongoose.model("Like");
//   const Subscription = mongoose.model("Subscription");

//   const likesCount = await Like.countDocuments({ video: videoId });

//   const isLiked = req.user?._id
//     ? await Like.exists({
//         video: videoId,
//         likedBy: req.user._id,
//       })
//     : false;

//   const isSubscribed = req.user?._id
//     ? await Subscription.exists({
//         channel: video.owner._id,
//         subscriber: req.user._id,
//       })
//     : false;

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         _id: video._id,
//         title: video.title,
//         description: video.description,
//         thumbnail: video.thumbnail,
//         videoFile: video.videoFile,
//         duration: video.duration,
//         views: video.views,
//         createdAt: video.createdAt,

//         likesCount,
//         isLiked,

//         owner: {
//           _id: video.owner._id,
//           username: video.owner.username,
//           avatar: video.owner.avatar,
//           fullName: video.owner.fullName,
//           isSubscribed,
//         },
//       },
//       "Video fetched successfully"
//     )
//   );
// });

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId)
    .populate("owner", "username avatar fullName");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  /* ================= VIEW COUNT ================= */
  if (req.user?._id) {
    const userId = req.user._id.toString();

    // ✅ SAFE CHECK (NO CRASH)
    const viewedBy = Array.isArray(video.viewedBy) ? video.viewedBy : [];

    const alreadyViewed = viewedBy.some(
      (id) => id.toString() === userId
    );

    if (!alreadyViewed) {
      video.views += 1;

      // only push if field exists
      if (Array.isArray(video.viewedBy)) {
        video.viewedBy.push(req.user._id);
      }

      await video.save();
    }

    /* ================= WATCH HISTORY (FIX) ================= */
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { watchHistory: video._id } }
    );

    await User.updateOne(
      { _id: req.user._id },
      {
        $push: {
          watchHistory: {
            $each: [video._id],
            $position: 0
          }
        }
      }
    );
  }

  /* ================= LIKES / SUBSCRIBE ================= */
  const Like = mongoose.model("Like");
  const Subscription = mongoose.model("Subscription");

  const likesCount = await Like.countDocuments({ video: videoId });

  const isLiked = req.user?._id
    ? await Like.exists({
        video: videoId,
        likedBy: req.user._id,
      })
    : false;

  const isSubscribed = req.user?._id
    ? await Subscription.exists({
        channel: video.owner._id,
        subscriber: req.user._id,
      })
    : false;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: video._id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        videoFile: video.videoFile,
        duration: video.duration,
        views: video.views,
        createdAt: video.createdAt,

        likesCount,
        isLiked,

        owner: {
          _id: video.owner._id,
          username: video.owner.username,
          avatar: video.owner.avatar,
          fullName: video.owner.fullName,
          isSubscribed,
        },
      },
      "Video fetched successfully"
    )
  );
});



// const updateData = asyncHandler(async (req, res) => {


//     const { videoId } = req.params
//     const {title, description} = req.body

//     if(!isValidObjectId(videoId)){
//         throw new ApiError(400, "Invalid Video Id")
//     }

//     let updateData = {title, description}

//     // Handle thumbnail file
//     if(req.files){
//         const thumbnailLocalPath = req.files.path

//         if(!thumbnailLocalPath){
//             throw new ApiError(400, "Thumbnail file is missing ")
//         }

//         const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

//         if(!thumbnail){
//             throw new ApiError(400, "Error while updating thumbnail")
//         }

//         updateData.thumbnail = thumbnail.url
//     }

//     // Find and update the video

//     const updatedVideo = await Video.findByIdAndUpdate(
//         videoId, 
//         {
//             $set: updateData
//         },
//         {
//             new: true, runValidators: true
//         }
//     )

//     if(!updatedVideo){
//         throw new ApiError(400, "Video not found")
//     }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, updatedVideo, "Video updated")
//     )
// }) 

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    // 1️⃣ Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    // 2️⃣ Build update object safely
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;

    // 3️⃣ Handle thumbnail update (optional)
    if (
        req.files &&
        Array.isArray(req.files.thumbnail) &&
        req.files.thumbnail.length > 0
    ) {
        const thumbnailLocalPath = req.files.thumbnail[0].path;

        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!thumbnail?.url) {
            throw new ApiError(400, "Error while uploading thumbnail");
        }

        updateData.thumbnail = thumbnail.url;
    }

    // 4️⃣ Update video
const updatedVideo = await Video.findOneAndUpdate(
  { _id: videoId, owner: req.user._id },
  { $set: updateData },
  { new: true, runValidators: true }
);

if (!updatedVideo) {
  throw new ApiError(403, "You are not allowed to update this video");
}

    // 5️⃣ Handle not found
    if (!updatedVideo) {
        throw new ApiError(404, "Video not found");
    }

    // 6️⃣ Response
    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    );
});


// const deleteVideo = asyncHandler(async (req, res) =>{
//     const {videoId } = req.params

//     if(!isValidObjectId(videoId)){
//         throw new ApiError(400, "Invalid video id")
//     }

//     const deletedVideo = await Video.findByIdAndDelete(videoId)

//     if(!deletedVideo){
//         throw new ApiError(400, "Video deletion failed")
//     }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, deletedVideo, "Video deleted successfully")
//     )
// })

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // 1️⃣ Validate video ID
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    // 2️⃣ Find video
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // 3️⃣ Authorization: only owner can delete
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this video");
    }

    // 4️⃣ Delete assets from Cloudinary
    // (Assuming you store Cloudinary public_id or can extract it)
    // if (video.videoFile) {
    //     await deleteFromCloudinary(video.videoFile);
    // }

    // if (video.thumbnail) {
    //     await deleteFromCloudinary(video.thumbnail);
    // }

    // 5️⃣ Delete video from DB
    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if (!deletedVideo) {
        throw new ApiError(500, "Video deletion failed");
    }

    // 6️⃣ Response
    return res.status(200).json(
        new ApiResponse(200, deletedVideo, "Video deleted successfully")
    );
});

// const togglePublishStatus = asyncHandler(async (req, res)=> {
//     const {videoId} = req.params

//     if(!isValidObjectId(videoId)){
//         throw new ApiError(400, "Invalid video id")
//     }

//     const video = await Video.findById(videoId)

//     if(!video){
//         throw new ApiError(404, "Video not found")
//     }

//     video.isPublished = !video.isPublished

//     await video.save()

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, video, "Video publish toggled successfully")
//     )
    
// })

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // 1️⃣ Validate ID
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    // 2️⃣ Find video
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // 3️⃣ Authorization check
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this video");
    }

    // 4️⃣ Toggle publish status
    video.isPublished = !video.isPublished;

    // 5️⃣ Save document (IMPORTANT FIX)
    await video.save();

    // 6️⃣ Response
    return res.status(200).json(
        new ApiResponse(
            200,
            { isPublished: video.isPublished },
            "Video publish status toggled successfully"
        )
    );
});


export {
    getAllVideos,
    getAllUserVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}