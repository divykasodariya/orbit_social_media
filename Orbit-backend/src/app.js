import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  // Add your actual Vercel domain when you deploy
  // "https://your-frontend-app.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost") ||
        origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser middleware
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Health check routes (BEFORE API routes)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'YouTube + Twitter API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes import
import userRouter from './routes/user.routes.js'
import subscriptionRouter from "./routes/subscription.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import { friendRouter, userGraphRouter } from "./routes/friend.routes.js"
import communityRouter from "./routes/community.routes.js"
import threadRouter from "./routes/thread.routes.js"
import feedRouter from "./routes/feed.routes.js"
import graphRouter from "./routes/graph.routes.js"
import recommendationRouter from "./routes/recommendation.routes.js"

import exploreRouter from "./routes/explore.routes.js"
import notificationRouter from "./routes/notification.routes.js"
import aiRouter from "./routes/ai.routes.js"

// API Routes
app.use("/api/v1/users", userRouter)
app.use("/api/v1/users", userGraphRouter)
app.use("/api/v1/friends", friendRouter)
app.use("/api/v1/communities", communityRouter)
app.use("/api/v1/threads", threadRouter)
app.use("/api/v1/feed", feedRouter)
app.use("/api/v1/explore", exploreRouter)
app.use("/api/v1/notifications", notificationRouter)
app.use("/api/v1/graph", graphRouter)
app.use("/api/v1/recommendations", recommendationRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlists", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/ai", aiRouter)

// 404 handler (AFTER all routes, BEFORE error handler)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

// Global error handler (VERY LAST)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error for debugging
  console.error('Error:', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Export app
export { app }
