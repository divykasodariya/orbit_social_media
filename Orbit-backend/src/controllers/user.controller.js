import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { createUserNode } from "../services/graph/userGraph.service.js";

// ============================================
// COOKIE CONFIGURATION HELPER
// ============================================
const getCookieOptions = (tokenType = "access") => {
    const isProduction = process.env.NODE_ENV === "production";

    // Match cookie expiry with JWT expiry
    const maxAge = tokenType === "refresh"
        ? 10 * 24 * 60 * 60 * 1000  // 10 days for refresh token
        : 1 * 24 * 60 * 60 * 1000;   // 1 day for access token

    return {
        httpOnly: true,
        secure: isProduction, // true in production (HTTPS), false in development
        sameSite: isProduction ? "none" : "lax", // "none" for cross-domain in production
        path: "/",
        maxAge: maxAge,
    };
};

// ============================================
// GENERATE TOKENS
// ============================================
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access and Refresh token")
    }
}


// ============================================
// FIXED REGISTER USER - Auto Login After Registration
// ============================================

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { fullName, email, password, username } = req.body

    // validation - not empty
    if (
        [fullName, username, email, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists - username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required to be uploaded")
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    // Create user in Neo4j
    try {
        console.log("🔥 Creating user node in Neo4j...");

        const neo4jUser = await createUserNode(
            user._id,
            user.username
        );

        console.log("✅ Neo4j user created:", neo4jUser);

    } catch (error) {
        console.error("❌ Failed to create Neo4j user:", error);
    }
    // ✅ GENERATE TOKENS FOR AUTO-LOGIN
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    // check for user creation and remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    // ✅ SET COOKIES (Same as login)
    const accessOptions = getCookieOptions("access");
    const refreshOptions = getCookieOptions("refresh");

    return res
        .status(201)
        .cookie("accessToken", accessToken, accessOptions)
        .cookie("refreshToken", refreshToken, refreshOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: createdUser,
                    accessToken,  // ✅ Send tokens in body as fallback
                    refreshToken
                },
                "User registered successfully"
            )
        )
})


// ============================================
// LOGIN USER
// ============================================
const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    const { email, username, password } = req.body

    // username or email validation
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    // find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // password verification
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password")
    }

    // access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookie with environment-based options
    const accessOptions = getCookieOptions("access");
    const refreshOptions = getCookieOptions("refresh");

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessOptions)
        .cookie("refreshToken", refreshToken, refreshOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,  // Send in body as fallback
                    refreshToken  // Send in body as fallback
                },
                "User logged in successfully"
            )
        )
})


// ============================================
// LOGOUT USER
// ============================================
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 },  // this removes field from the document
        },
        {
            new: true
        }
    )

    const accessOptions = getCookieOptions("access");
    const refreshOptions = getCookieOptions("refresh");

    return res
        .status(200)
        .clearCookie("accessToken", accessOptions)
        .clearCookie("refreshToken", refreshOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})


// ============================================
// REFRESH ACCESS TOKEN
// ============================================
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or already used")
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user._id)

        const accessOptions = getCookieOptions("access");
        const refreshOptions = getCookieOptions("refresh");

        return res
            .status(200)
            .cookie("accessToken", accessToken, accessOptions)
            .cookie("refreshToken", refreshToken, refreshOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,  // Send in body as fallback
                        refreshToken  // Send in body as fallback
                    },
                    "Access token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})


// ============================================
// CHANGE PASSWORD
// ============================================
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})


// ============================================
// GET CURRENT USER
// ============================================
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})


// ============================================
// UPDATE ACCOUNT DETAILS
// ============================================
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email,
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        )
})


// ============================================
// UPDATE AVATAR
// ============================================
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar?.url) {
        throw new ApiError(500, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar updated successfully")
        )
})


// ============================================
// UPDATE COVER IMAGE
// ============================================
const updateCoverImageAvatar = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage?.url) {
        throw new ApiError(500, "Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { coverImage: coverImage.url }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover image updated successfully")
        )
})


// ============================================
// GET USER CHANNEL PROFILE
// ============================================
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    const viewerId = req.user?._id
        ? new mongoose.Types.ObjectId(req.user._id)
        : null;

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: viewerId
                    ? { $in: [viewerId, "$subscribers.subscriber"] }
                    : false,
            },
        },
        {
            $project: {
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
            },
        },
    ]);

    if (!channel.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            channel[0],
            "User channel fetched successfully"
        )
    );
});


// ============================================
// GET WATCH HISTORY
// ============================================
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            },
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch History fetched successfully"
            )
        )
})


// ============================================
// SEARCH USERS BY USERNAME
// ============================================
const searchUsers = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const currentUserId = req.user._id;

    if (!q || !q.trim()) {
        throw new ApiError(400, "Search query is required");
    }

    const regex = new RegExp(q.trim(), "i");

    const users = await User.find({
        _id: { $ne: currentUserId },
        $or: [
            { username: { $regex: regex } },
            { fullName: { $regex: regex } }
        ]
    })
        .select("username fullName avatar")
        .limit(10);

    return res.status(200).json(
        new ApiResponse(200, users, "Search results fetched successfully")
    );
});


// ============================================
// EXPORTS
// ============================================
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateAccountDetails,
    updateCoverImageAvatar,
    getUserChannelProfile,
    getWatchHistory,
    searchUsers
}