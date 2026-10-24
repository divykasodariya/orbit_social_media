import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { findShortestPathBfs } from "../services/graph/bfs.service.js";
import { traverseGraphDfs } from "../services/graph/dfs.service.js";
import { getMutualConnections } from "../services/graph/mutual.service.js";

export const getPath = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const path = await findShortestPathBfs(currentUserId, userId);

    return res.status(200).json(
        new ApiResponse(200, { path: path || [] }, "BFS shortest path fetched")
    );
});

export const getTraverse = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const paths = await traverseGraphDfs(userId);

    return res.status(200).json(
        new ApiResponse(200, { paths }, "DFS traversal completed")
    );
});

export const getMutuals = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const mutuals = await getMutualConnections(currentUserId, userId, 20);

    return res.status(200).json(
        new ApiResponse(200, { mutuals }, "Top mutual connections fetched")
    );
});
