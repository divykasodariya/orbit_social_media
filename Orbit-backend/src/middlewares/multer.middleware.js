// ============================================
// FIXED multer.middleware.js - Correct Path
// ============================================

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// ✅ Get current directory (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Go up to project root, then into public/temp
// From: src/middlewares/multer.middleware.js
// To:   public/temp
const tempDir = path.join(__dirname, "../../public/temp");

// ✅ Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log("✅ Created temp directory:", tempDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("📁 Saving file to:", tempDir);
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // ✅ Add timestamp to prevent name collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + "-" + file.originalname;
    console.log("📝 Generated filename:", filename);
    cb(null, filename);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("🔍 Validating file:", file.fieldname, file.mimetype);
    
    if (file.fieldname === "videoFile") {
      if (!file.mimetype.startsWith("video/")) {
        return cb(new Error("Only video files allowed for videoFile"));
      }
    }
    if (file.fieldname === "thumbnail") {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files allowed for thumbnail"));
      }
    }
    cb(null, true);
  },
});