import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Check cookies first, then Authorization header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "")?.trim();

    console.log("🔐 Token verification:", {
      hasCookie: !!req.cookies?.accessToken,
      hasHeader: !!req.header("Authorization"),
      token: token ? "exists" : "missing"
    });

    if (!token) {
      throw new ApiError(401, "Unauthorized access - No token provided");
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        throw new ApiError(401, "Access token expired");
      }
      throw new ApiError(401, "Invalid access token");
    }

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token - User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    // Pass the error to Express error handler
    throw new ApiError(
      401,
      error?.message || "Authentication failed"
    );
  }
});

// Optional: Middleware for routes that work both authenticated and unauthenticated
export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "")?.trim();

    if (!token) {
      req.user = null;
      return next();
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    req.user = user || null;
    next();
  } catch (error) {
    // Don't throw error, just set user to null
    req.user = null;
    next();
  }
});