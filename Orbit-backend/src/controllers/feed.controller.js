import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getUnifiedFeed } from "../services/graph/feed.service.js";

export const getHomeFeed = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { cursor, limit = 20 } = req.query;

    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
        throw new ApiError(400, "Limit must be between 1 and 50");
    }

    const { feed, nextCursor } = await getUnifiedFeed(userId, cursor, limitNum);

    return res.status(200).json(
        new ApiResponse(
            200, 
            { items: feed, nextCursor }, 
            "Unified feed fetched successfully"
        )
    );
});
