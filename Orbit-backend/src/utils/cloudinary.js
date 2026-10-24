// ============================================
// PRODUCTION-SAFE CLOUDINARY CONFIGURATION
// ============================================

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary with proper cleanup and error handling
 * @param {string} localFilePath - Path to the local file
 * @returns {Promise<object|null>} Cloudinary response or null on failure
 */
const uploadOnCloudinary = async (localFilePath) => {
  try {
    // ✅ Validate input
    if (!localFilePath) {
      console.warn("⚠️ No file path provided to uploadOnCloudinary");
      return null;
    }

    // ✅ Check if file exists
    if (!fs.existsSync(localFilePath)) {
      console.warn(`⚠️ File not found: ${localFilePath}`);
      return null;
    }

    // ✅ Upload to Cloudinary with HTTPS enforced
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      secure: true, // ✅ Force HTTPS URLs
      timeout: 60000, // ✅ 60 second timeout
    });

    // ✅ Delete temporary file after successful upload
    try {
      fs.unlinkSync(localFilePath);
      console.log(`✅ Uploaded and cleaned up: ${localFilePath}`);
    } catch (unlinkError) {
      console.warn(`⚠️ Failed to delete temp file: ${localFilePath}`, unlinkError.message);
      // Don't fail the upload if cleanup fails
    }

    // ✅ Return response with HTTPS URL guaranteed
    return {
      ...response,
      url: response.secure_url, // Always use secure_url
    };

  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);

    // ✅ Cleanup temp file even on failure
    if (localFilePath && fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
        console.log(`🗑️ Cleaned up failed upload: ${localFilePath}`);
      } catch (unlinkError) {
        console.warn(`⚠️ Failed to cleanup after error: ${localFilePath}`);
      }
    }

    return null;
  }
};

/**
 * Delete file from Cloudinary (optional - for future use)
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      console.warn("⚠️ No public ID provided to deleteFromCloudinary");
      return false;
    }

    const response = await cloudinary.uploader.destroy(publicId);
    
    if (response.result === "ok") {
      console.log(`✅ Deleted from Cloudinary: ${publicId}`);
      return true;
    } else {
      console.warn(`⚠️ Cloudinary delete failed: ${publicId}`, response);
      return false;
    }
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error.message);
    return false;
  }
};

/**
 * Extract public ID from Cloudinary URL (helper function)
 * @param {string} cloudinaryUrl - Full Cloudinary URL
 * @returns {string|null} Public ID or null
 */
const extractPublicId = (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl) return null;
    
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
    const parts = cloudinaryUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Get everything after /upload/v123456789/
    const afterUpload = parts.slice(uploadIndex + 2).join('/');
    
    // Remove file extension
    return afterUpload.split('.')[0];
  } catch (error) {
    console.error("❌ Error extracting public ID:", error.message);
    return null;
  }
};

export { 
  uploadOnCloudinary, 
  deleteFromCloudinary,
  extractPublicId 
};





















// import { v2 as cloudinary } from "cloudinary";
// import fs from "fs/promises";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploadOnCloudinary = async (localFilePath) => {
//   try {
//     if (!localFilePath) return null;

//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: "auto",
//       secure: true, // ensure HTTPS
//     });

//     // cleanup temp file
//     await fs.unlink(localFilePath).catch(() => {});

//     // 🔒 FORCE HTTPS URL
//     return {
//       ...response,
//       url: response.secure_url,
//     };
//   } catch (error) {
//     if (localFilePath) {
//       await fs.unlink(localFilePath).catch(() => {});
//     }
//     return null;
//   }
// };

// export { uploadOnCloudinary };

































// // import { v2 as cloudinary } from "cloudinary";
// // import fs from "fs"

// // cloudinary.config({ 
// //     cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
// //     api_key: process.env.CLOUDINARY_API_KEY, 
// //     api_secret: process.env.CLOUDINARY_API_SECRET 
// // });



// // const uploadOnCloudinary = async (localFilePath) => {
// //     try{
// //         if(!localFilePath) return null;
// //         // upload the file on cloudinary
// //         const response = await cloudinary.uploader.upload(localFilePath, {
// //             resource_type: "auto"
// //         })
// //         // file has been uploaded successfully 
// //         console.log("file has been uploaded successfully", response.url)
// //         return response;
// //     }
// //     catch(error){
// //         fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
// //         return null;
// //     }
// // }

// // export {uploadOnCloudinary}

// import { v2 as cloudinary } from "cloudinary";
// import fs from "fs";
// import { ApiError } from "./ApiError.js";
// // import {extractPublicId} from "cloudinary-build-url"
// import { response } from "express";


// //This was being used earlier
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

// const uploadOnCloudinary = async (localFilePath) => {
//     try {
//         if (!localFilePath) {
//             // console.log("❌ No file path found");
//             return null;
//         }

//         const response = await cloudinary.uploader.upload(localFilePath, {
//             resource_type: "auto"
//         });

//         // console.log("☁️ Cloudinary Upload Success:", response.url);

//         // DELETE FILE AFTER UPLOAD
//         fs.unlinkSync(localFilePath);

//         return response;

//     } catch (error) {
//         // console.log("❌ Cloudinary upload error:", error.message);

//         // delete file even if upload fails
//         fs.unlinkSync(localFilePath);

//         return null;
//     }
// };













// // const deleteOnCloudinary = async(image) => {
// //     try{
// //         if(!image){
// //             throw new ApiError(404, "Image Invalid")
// //         }

// //         const publicId = extractPublicId(image)

// //         const response = await cloudinary.uploader.destroy(publicId)
// //         if(response.result != 'ok'){
// //             throw new ApiError(400, "Old image deletion failed on cloudinary")
// //         }

// //         return 1;
// //     }
// //     catch(error){
// //         return null;
// //     }
// // }

// export { uploadOnCloudinary, /*deleteOnCloudinary*/ };
