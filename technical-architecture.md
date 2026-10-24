# Orbit - Technical Architecture & Features Documentation

This document compiles the core features implemented in the `Orbit` (YouTube + Twitter clone) application, detailing the technical decisions on **how** they were built and **why** those approaches were chosen.

---

## 1. Authentication & Security (JWT & Bcrypt)
**Features:** 
- Secure user registration and login.
- Auto-login upon registration.
- Session persistence using Access and Refresh tokens.
- Secure, HTTP-only cookie management.

**How it is implemented:**
- **Password Hashing:** Uses `bcrypt` inside a Mongoose `pre('save')` hook to automatically hash passwords before saving them to the database. It also provides a custom method `isPasswordCorrect` on the schema.
- **JWT Generation:** Uses the `jsonwebtoken` library. The `generateAccessToken` method signs short-lived tokens containing user payload, while `generateRefreshToken` signs long-lived tokens stored in the database.
- **Cookie Management:** The Express backend uses `cookie-parser` to send tokens back to the frontend in `httpOnly`, `secure` cookies.
- **Refresh Flow:** A dedicated `/refresh-token` endpoint validates the refresh token from the database/cookie and issues a fresh pair of tokens without requiring the user to log in again.

**Why this approach?**
- **Bcrypt:** Passwords should never be stored in plain text to prevent data breach vulnerabilities.
- **JWT + Refresh Tokens:** A dual-token architecture provides a balance between security and user experience. Short-lived access tokens limit the window of opportunity if stolen, while refresh tokens keep the user logged in without constant friction.
- **HTTP-Only Cookies:** Prevents Cross-Site Scripting (XSS) attacks from reading the tokens via JavaScript on the frontend.

---

## 2. Media Uploads & Storage (Multer & Cloudinary)
**Features:**
- Robust handling of user-uploaded files (avatars, cover images, and videos).
- Cloud-based storage for scalability and performance.
- Temporary local storage for processing before upload.

**How it is implemented:**
- **Multer Middleware:** Configured in `src/middlewares/multer.middleware.js` to accept `multipart/form-data`. It saves incoming files temporarily to `public/temp/`.
- **Cloudinary Integration:** A custom utility `src/utils/cloudinary.js` reads the temporary file using `fs`, uploads it securely to Cloudinary using their SDK, and immediately deletes the local temporary file using `fs.unlinkSync()`.
- **Controller Logic:** The controllers (e.g., user registration) extract the local file path from `req.files`, await the Cloudinary upload, and store the resulting secure URL in MongoDB.

**Why this approach?**
- **Cloudinary:** Storing large files (especially videos) directly in a MongoDB database or local server file system is an anti-pattern. Cloudinary provides optimized CDN delivery, automatic format conversion, and infinite scalability.
- **Two-Step Upload (Multer -> Cloudinary):** Buffering large video files entirely in RAM can crash the Node.js server. Saving them temporarily to the disk allows the server to handle the memory load efficiently before pushing to the cloud.

---

## 3. Standardized API Responses & Error Handling
**Features:**
- Predictable and uniform JSON structures for all API responses.
- Centralized error catching.

**How it is implemented:**
- **Custom Classes:** Created `ApiError.js` (extending the native Node `Error` class) and `ApiResponse.js`.
- **AsyncHandler Wrapper:** A higher-order function `asyncHandler.js` wraps all controller functions. It catches any unhandled Promise rejections and forwards them to Express's `next()` function.
- **Global Error Middleware:** At the very end of `app.js`, an error-handling middleware intercepts `ApiError` instances and formats them into a standard `{ success: false, message: "...", statusCode: ... }` JSON response.

**Why this approach?**
- **Maintainability:** Writing `try/catch` blocks inside every single controller is verbose and prone to human error. The `asyncHandler` eliminates boilerplate.
- **Frontend Predictability:** The frontend can reliably expect the same JSON structure for every request (e.g., checking `response.data.success`), making HTTP interceptors and UI state management much easier.

---

## 4. Complex Data Relationships (MongoDB Aggregation Pipelines)
**Features:**
- Social features like Subscriptions, Watch History, Likes, and Comments.
- Channel dashboards calculating total views, subscriber counts, and like ratios.

**How it is implemented:**
- **Reference Schemas:** Collections like `Subscription`, `Like`, and `Comment` use `Schema.Types.ObjectId` to reference `User`, `Video`, and `Tweet` documents.
- **Aggregation Pipelines:** Instead of making multiple round-trip queries to the database (e.g., finding a user, then finding their subscribers, then finding their videos), the backend utilizes Mongoose Aggregation pipelines (`$match`, `$lookup`, `$addFields`, `$project`) to compute complex relationships entirely on the database layer.
- **Pagination:** Uses `mongoose-aggregate-paginate-v2` to paginate heavy aggregation results (like video feeds or comment sections).

**Why this approach?**
- **Performance:** MongoDB is highly optimized for executing aggregations in C++. Performing joins (`$lookup`) and calculations on the database server is drastically faster than fetching thousands of documents into the Node.js RAM and filtering them with JavaScript.
- **Scalability:** Pagination ensures that endpoints like "Get all comments for a video" do not crash the server or consume excessive bandwidth when a video goes viral.

---

## 5. Extensible Application Architecture (MVC)
**Features:**
- Clean separation of concerns.
- Modular routing.

**How it is implemented:**
- The codebase follows a standard Model-View-Controller (MVC) pattern (adapted for APIs):
  - **Models (`src/models/`)**: Define the Mongoose schemas.
  - **Controllers (`src/controllers/`)**: Contain the core business logic.
  - **Routes (`src/routes/`)**: Map HTTP methods and endpoints to specific controllers.
  - **Middlewares (`src/middlewares/`)**: Reusable logic (auth checks, file handling) applied before reaching the controller.
- **`app.js` vs `index.js`:** Express application configuration (`app.js`) is separated from the database connection and server initialization (`index.js`).

**Why this approach?**
- **Readability & Collaboration:** As the application grows to include Tweets, Playlists, and Dashboards, keeping everything in one file would be impossible to navigate. This modularity allows different developers to work on different feature branches without merge conflicts.
