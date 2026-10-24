import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recommendUsers } from "../services/recommendation/userRecommendation.service.js";
import { recommendCommunities } from "../services/recommendation/communityRecommendation.service.js";

import { User } from "../models/user.model.js";

export const getUserRecommendations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const rawRecommendations = await recommendUsers(userId, 10);
    
    // Populate user details from MongoDB
    const populatedRecommendations = await Promise.all(
        rawRecommendations.map(async (rec) => {
            const user = await User.findById(rec.userId).select("username fullName avatar");
            return {
                ...rec,
                user
            };
        })
    );

    // Filter out any where user wasn't found in Mongo
    const recommendations = populatedRecommendations.filter(r => r.user != null);

    return res.status(200).json(
        new ApiResponse(200, recommendations, "User recommendations generated")
    );
});

export const getCommunityRecommendations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const recommendations = await recommendCommunities(userId, 10);

    return res.status(200).json(
        new ApiResponse(200, recommendations, "Community recommendations generated")
    );
});
