import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";

/* ======================================================
   TOGGLE SUBSCRIPTION
====================================================== */
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel Id");
  }

  if (channelId.toString() === userId.toString()) {
    throw new ApiError(400, "You can't subscribe to your own channel");
  }

  // Ensure channel exists
  const channelExists = await User.findById(channelId);
  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }

  const existingSubscription = await Subscription.findOne({
    channel: channelId,
    subscriber: userId
  });

  let isSubscribed;

  if (existingSubscription) {
    await Subscription.deleteOne({ _id: existingSubscription._id });
    isSubscribed = false;
  } else {
    await Subscription.create({
      subscriber: userId,
      channel: channelId
    });
    isSubscribed = true;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { isSubscribed },
      "Subscription toggled successfully"
    )
  );
});

/* ======================================================
   GET CHANNEL SUBSCRIBERS
====================================================== */
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel Id");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber"
      }
    },
    { $unwind: "$subscriber" },
    {
      $project: {
        _id: 0,
        username: "$subscriber.username",
        avatar: "$subscriber.avatar",
        fullName: "$subscriber.fullName"
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      subscribers,
      "Channel subscribers fetched successfully"
    )
  );
});

/* ======================================================
   GET CHANNELS USER SUBSCRIBED TO
====================================================== */
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscriberId = req.user._id;

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel"
      }
    },
    { $unwind: "$channel" },
    {
      $project: {
        _id: "$channel._id",
        username: "$channel.username",
        avatar: "$channel.avatar",
        fullName: "$channel.fullName"
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      channels,
      "Subscribed channels fetched successfully"
    )
  );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels
};








// import mongoose,{isValidObjectId} from "mongoose"
// import { asyncHandler } from "../utils/asyncHandler.js";
// import {ApiError} from "../utils/ApiError.js"
// import {Subscription} from "../models/subscription.model.js"
// import {ApiResponse} from "../utils/ApiResponse.js"

// const toggleSubscription = asyncHandler(async (req, res) => {
//     const {channelId} = req.params
//     // TODO: toggle subscription

//     if(!isValidObjectId(channelId)){
//         throw new ApiError(400, "Invalid Channel Id")
//     }

//     const isSubscribed = await Subscription.findOne({channel: channelId, subscriber: req.user._id});

//     if(req.user._id == channelId){
//         throw new ApiError(400, "You can't subscribe your own channel")
//     }

//     if(!isSubscribed){
//         const channel = await Subscription.create({
//             subscriber: req.user._id,
//             channel: channelId
//         })

//         return res
//         .status(200)
//         .json(
//             new ApiResponse(200, channel, "Subscribed channel")
//         )
//     }
//     else{
//         const channel = await isSubscribed.deleteOne();

//         return res
//         .status(200)
//         .json(
//             new ApiResponse(200, channel, "Unsubscribed channel")
//         )
//     }
// })


// // controller to return subscriber list of a channel
// const getUserChannelSubscribers = asyncHandler(async(req, res) => {
//     const { channelId } = req.params

//     if(!isValidObjectId(channelId)){
//         throw new ApiError(400, "Invalid Channel Id")
//     }

//     const subscribers = await Subscription.aggregate([
//         {
//             $match: {
//                 channel: new mongoose.Types.ObjectId(channelId)
//             }
//         },
//         {
//             $lookup: {
//                 from: "users",
//                 localField: "subscriber",
//                 foreignField: "_id",
//                 as: "subscriberDetails"
//             }
//         },
//         {
//             $unwind: "$subscriberDetails"
//         },
//         {
//             $project: {
//                 _id: 0,
//                 username: "$subscriberDetails.username",
//                 avatar: "$subscriberDetails.avatar"
//             }
//         }
//     ])

//     if(!subscribers){
//         throw new ApiError(400, "Fetching Subscriber failed");
//     }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, subscribers, "Channel subscriber fetched successfully")
//     )
    
// })


// // controller to return channel list to which user has subscribed
// // const getSubscribedChannels = asyncHandler(async(req, res) => {
// //     const { subscriberId } = req.params

// //     if(!isValidObjectId(subscriberId)){
// //         throw new ApiError(400, "Invalid subscriber Id")
// //     }

// //     const channels = await Subscription.aggregate([
// //         {
// //             $match: {
// //                 subscriber: new mongoose.Types.ObjectId(subscriberId)
// //             }
// //         },
// //         {
// //             $lookup: {
// //                 from: "users",
// //                 localField: "channel",
// //                 foreignField: "_id",
// //                 as: "channelDetails"
// //             }
// //         },
// //         {
// //             $unwind: "$channelDetails"
// //         },
// //         {
// //             $project: {
// //                 _id: 1,
// //                 username: "$channelDetails.username",
// //                 avatar: "$channelDetails.avatar",
// //                 fullName: "$channelDetails.fullName",
// //             }
// //         }
// //     ])

// //     if(!channels){
// //         throw new ApiError(400, "Fetching channel details failed")
// //     }

// //     return res
// //     .status(200)
// //     .json(
// //         new ApiResponse(200, channels, "User subscribed Channels fetched successfully")
// //     )
// // })
// const getSubscribedChannels = asyncHandler(async (req, res) => {
//   const subscriberId = req.user._id;

//   const channels = await Subscription.aggregate([
//     {
//       $match: {
//         subscriber: new mongoose.Types.ObjectId(subscriberId)
//       }
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "channel",
//         foreignField: "_id",
//         as: "channelDetails"
//       }
//     },
//     { $unwind: "$channelDetails" },
//     {
//       $project: {
//         _id: 1,
//         username: "$channelDetails.username",
//         avatar: "$channelDetails.avatar",
//         fullName: "$channelDetails.fullName"
//       }
//     }
//   ]);

//   return res.status(200).json(
//     new ApiResponse(200, channels, "Subscribed channels fetched")
//   );
// });



// export {
//     toggleSubscription, 
//     getUserChannelSubscribers,
//     getSubscribedChannels
// }