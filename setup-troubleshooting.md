# Orbit Local Development Setup & Troubleshooting Log

This document details the technical steps taken, the challenges encountered, and the solutions implemented to get the `Orbit` (YouTube + Twitter) application running locally.

---

## 1. Initial Repository Cleanup
**What was done:** Removed the existing `.git` directory in the root workspace.
**How it was done:** Executed `rm -rf .git`.
**Why it was done:** To detach the project from its original cloned repository history, allowing the initialization of a fresh, clean git repository specific to this new project.

## 2. Backend Environment Variables (`.env`)
**What was done:** Created a `.env` file in `Orbit-backend` to manage local development secrets.
**How it was done:** 
- Extracted the required environment variables from the production `render.yaml` specification.
- Generated secure random strings for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
- **Formatting Fix:** Fixed a formatting issue with the `MONGODB_URI`. The trailing `/` or `/?` was removed from the connection string to prevent a double-slash error (e.g., `...mongodb.net//videotube`) when `Mongoose` dynamically appended the database name during connection initialization.
**Why it was done:** The application requires database credentials, JWT secrets for authentication, and Cloudinary keys for media storage to boot up and function correctly.

## 3. Frontend-to-Backend Networking
**What was done:** Linked the Vite React frontend to the Express backend.
**How it was done:** Created a `.env` file in the `Orbit-frontend` directory and explicitly defined the API base URL:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```
**Why it was done:** The frontend's HTTP utility (Axios) was defaulting to relative paths, which caused requests to be sent to Vite's own development server on port 5173. By explicitly pointing `VITE_API_BASE_URL` to port 8000, we routed API calls directly to the Express backend. The backend already had a `cors` middleware configured to accept cross-origin requests from `http://localhost:5173`.

## 4. Cloudinary "Avatar Required" Upload Error
**What was done:** Debugged and resolved a persistent "Avatar file is required to be uploaded" error during user registration.
**How it was done:** 
- Discovered that the backend user controller was throwing this error because the Cloudinary upload utility was returning `null`.
- Identified that the `CLOUDINARY_CLOUD_NAME` in the `.env` file was incorrectly set to `Root`. 
- Updated the cloud name to the correct identifier (`vafui46t`), extracted from the `CLOUDINARY_URL` format.
**Why it was done:** The Cloudinary SDK silently fails and logs to the console if the credentials are invalid. The backend controller relies on the successful upload URL; if it's missing, it halts the registration process assuming the file upload failed.

## 5. Stale Process Port Conflict
**What was done:** Resolved a "Ghost Process" issue where `.env` updates were not taking effect.
**How it was done:** 
- Identified that an older background instance of `npm run dev` was still actively listening on port 8000.
- Killed the lingering Node.js process and restarted the server.
**Why it was done:** The older process was holding the port and executing incoming requests using a cached, outdated version of the `.env` file (containing the invalid `Root` cloud name). Restarting the process forced the environment to reload the corrected Cloudinary keys.

## 6. JWT Generation Crash
**What was done:** Fixed a `500 Internal Server Error` occurring immediately after a successful file upload during registration.
**How it was done:** 
- Traced the stack trace to `user.generateAccessToken()` in `user.model.js`.
- Identified that the `jsonwebtoken` library's `jwt.sign()` method was crashing because the `expiresIn` property was receiving an `undefined` value.
- Appended the missing variables to the backend `.env` file:
```env
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d
```
**Why it was done:** The original `render.yaml` specification did not list the token expiries. However, the user model architecture strictly required `process.env.ACCESS_TOKEN_EXPIRY` and `process.env.REFRESH_TOKEN_EXPIRY` to issue session tokens. Adding them resolved the crash and allowed the signup flow to complete.
