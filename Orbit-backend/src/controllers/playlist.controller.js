import mongoose, {isValidObjectId} from "mongoose";
import { PlayList } from "../models/playlist.model.js";
import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const createPlaylist = asyncHandler(async (req, res) =>{
    const {name, description} = req.body

    if(!name || !description){
        throw new ApiError(400, "Name and description are required")
    }

    const playlist = await PlayList.create({
        name, 
        description,
        owner: req.user._id
    })

    if(!playlist){
        throw new ApiError(500, "Something went wrong while creating playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist created successfully")
    )
})

// const getUserPlaylist = asyncHandler(async(req, res)=>{
//     const {userId} = req.params

//     if(!isValidObjectId(userId)){
//         throw new ApiError(400, "Invalid user access")
//     }

//     const playlist = await PlayList.find({owner: userId})
//     .populate({
//         path: "videos",
//         select: "thumbnail"
//     })

//     if (!playlist.length) {
//     throw new ApiError(404, "No playlists found for this user")
// }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, playlist, "User playlist fetched successfully")
//     )
// })
// const getUserPlaylist = asyncHandler(async (req, res) => {
//     const { userId } = req.params

//     // Validate userId
//     if (!isValidObjectId(userId)) {
//         throw new ApiError(400, "Invalid user access")
//     }

//     // Ownership / self-access check
//     if (req.user._id.toString() !== userId) {
//         throw new ApiError(403, "You are not authorized to access these playlists")
//     }

//     const playlists = await PlayList.find({ owner: userId })
//         .populate({
//             path: "videos",
//             select: "thumbnail title duration"
//         })

//     // find() returns an array — check length, not null
//     if (!playlists.length) {
//         throw new ApiError(404, "No playlists found for this user")
//     }

//     return res.status(200).json(
//         new ApiResponse(
//             200,
//             playlists,
//             "User playlists fetched successfully"
//         )
//     )
// })

const getUserPlaylist = asyncHandler(async (req, res) => {
    const { userId } = req.params

    // Validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user access")
    }

    // Ownership / self-access check
    if (req.user._id.toString() !== userId) {
        throw new ApiError(403, "You are not authorized to access these playlists")
    }

    const playlists = await PlayList.find({ owner: userId })
        .populate({
            path: "videos",
            select: "thumbnail title duration"
        })

    // ✅ IMPORTANT FIX:
    // Do NOT throw error if playlists are empty
    // Empty array is a valid response

    return res.status(200).json(
        new ApiResponse(
            200,
            playlists, // [] when no playlists
            "User playlists fetched successfully"
        )
    )
})


const getPlaylistById = asyncHandler(async (req, res)=> {
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist Id")
    }

    const playlist = await PlayList.findOne({
        _id: playlistId,
        owner: req.user._id
    }).populate("videos")


    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    )
})

// const addVideoToPlaylist = asyncHandler(async (req, res)=>{
//     const {playlistId, videoId} = req.params

//     if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
//         throw new ApiError(400, "Invalid Playlist-Id or User-Id")
//     }

//     const playlist = await PlayList.findByIdAndUpdate(
//         playlistId,
//         {
//             $addToSet: {videos: "videoId"}
//         },
//         {
//             new: true
//         }
//     )

//     if(!playlist){
//         throw new ApiError(404, "Playlist not found")
//     }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, playlist, "Video added to playlist successfully")
//     )
// })
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    // Validate ObjectIds
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist-Id or Video-Id")
    }

    // Add video only if the playlist belongs to the logged-in user
    const playlist = await PlayList.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $addToSet: { videos: videoId } // prevents duplicates
        },
        {
            new: true
        }
    )

    if (!playlist) {
        throw new ApiError(
            404,
            "Playlist not found or you are not authorized to modify it"
        )
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "Video added to playlist successfully"
        )
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res)=>{
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Playlist-Id or User-Id")
    }

    const playlist = await PlayList.findByIdAndUpdate(
        { _id: playlistId, owner: req.user._id },
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if(!playlist){
        throw new ApiError(400, "Removing Video from Playlist failed")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Video removed from Playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res)=>{
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist Id")
    }

    const playlist = await PlayList.findOneAndDelete({
        _id: playlistId,
        owner: req.user._id
    })

    if(!playlist){
        throw new ApiError(400, "Removing playlist failed")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist removed successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res)=>{
    const {playlistId}= req.params
    const { name, description} = req.body

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist ID")
    }

    if(!name || !description){
        throw new ApiError(404 ,"Name or Description not found")
    }

    const playlist = await PlayList.findOneAndUpdate(
            { _id: playlistId, owner: req.user._id },
            {
                $set: { name, description }
            },
            {
                new: true,
                runValidators: true
            }
        )

    if(!playlist){
        throw new ApiError(400, "Updating playlist failed")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist Updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylist,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}