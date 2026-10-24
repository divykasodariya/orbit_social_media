import mongoose, {isValidObjectId} from "mongoose";
import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import {Subscription} from "../models/subscription.model.js"
import { Like } from "../models/like.model.js";

// const getChannelStats = asyncHandler(async (req, res)=>{
//     // TODO: get the channel stats like total video, views, total subscribers, total videos etc

//     const user = await User.aggregate([
//         {
//             $match: {
//                 _id: new mongoose.Types.ObjectId(req.user._id)
//             }
//         },
//         {
//             $lookup: {
//                 from: "videos",
//                 localField: "_id",
//                 foreignField: "owner",
//                 as: "videoDetails"
//             }
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "channel",
//                 as: "subscriptionDetails"
//             }
//         },
//         {
//             $lookup: {
//                 from: "likes",
//                 let: {userVideos: "$videoDetails._id"},
//                 pipeline: [
//                     {
//                         $match: {
//                             $in:
//                                 ["$video", "$userVideos"]
//                         }
//                     }
//                 ],
//                 as: "likeDetails"
//             }
//         },
//         {
//             $addFields: {
//                 totalViews: {
//                     $sum: {
//                         $map: {
//                             input: "$videosDetails",
//                             as: "video",
//                             in: {
//                                 if: {$isArray: "$video.views"},
//                                 then: {$size: "$video.views"},
//                                 else: {$ifNull: ["$video.views", 0]}
//                             }
//                         }
//                     }
//                 },
//                 totalLikes: {$size: "likesDetails"},
//                 totalSubscribers: {$size: "$subscriptionDetails"}
//             }
//         },
//         {
//             $project: {
//                 username: 1,
//                 totalLikes: 1,
//                 totalSubscribers: 1,
//                 totalLikes: 1,
//                 "videoDetails._id": 1,
//                 "videoDetails.isPublished": 1,
//                 "videoDetails.thumbnail": 1,
//                 "videoDetails.title": 1,
//                 "videoDetails.description": 1,
//                 "videoDetails.createdAt": 1
//             }
//         }
//     ])

//     if(!user){
//         throw new ApiError(400, "Error fetching stats")
//     }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, user, "Fetching Channel stats successfully")
//     )
// })

const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.user._id

    const stats = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "likes",
                let: { videoIds: "$videos._id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ["$video", "$$videoIds"]
                            }
                        }
                    }
                ],
                as: "likes"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                totalSubscribers: { $size: "$subscribers" },
                totalLikes: { $size: "$likes" },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 0,
                username: 1,
                totalVideos: 1,
                totalViews: 1,
                totalLikes: 1,
                totalSubscribers: 1,
                videos: {
                    _id: 1,
                    title: 1,
                    thumbnail: 1,
                    isPublished: 1,
                    createdAt: 1
                }
            }
        }
    ])

    if (!stats.length) {
        throw new ApiError(404, "Channel stats not found")
    }

    return res.status(200).json(
        new ApiResponse(200, stats[0], "Channel stats fetched successfully")
    )
})

// const getChannelVideos = asyncHandler(async (req, res)=>{
//     const videos = await Video.aggregate([
//         {
//             $match: {
//                 owner: new mongoose.Types.ObjectId(req.user._id)
//             }
//         },
//         {
//             $addFields: {
//                 views: {
//                     $cond: {
//                         if: {$isArray: "$views"},
//                         then: {$size: "$views"},
//                         else: {$ifNull: ["$views", 0]}
//                     }
//                 }
//             }
//         }
//     ])

//     if(!videos){
//         throw new ApiError(400, "Fetching channel videos failed")
//     }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, videos, "Fetching channel videos successfully")
//     )
// })

const getChannelVideos = asyncHandler(async (req, res) => {
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $project: {
                title: 1,
                thumbnail: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, videos, "Channel videos fetched successfully")
    )
})



export {
    getChannelStats,
    getChannelVideos
}