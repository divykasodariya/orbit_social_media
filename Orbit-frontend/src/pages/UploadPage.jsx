import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, Video } from "lucide-react";
import { publishVideo } from "../api/video.api";
import { useAuth } from "../context/AuthContext";

const UploadPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [videoFile, setVideoFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="text-center mt-20 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Please login to upload a video
      </div>
    );
  }

  const handleUpload = async () => {
    if (!videoFile || !thumbnail || !title.trim()) {
      setError("Video, thumbnail and title are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("videoFile", videoFile);
      formData.append("thumbnail", thumbnail);
      formData.append("title", title);
      formData.append("description", description);

      await publishVideo(formData);
      navigate("/studio/videos");
    } catch (err) {
      console.error("Upload failed", err);
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.35s_ease-out]">
      <h1 className="text-3xl font-bold mb-8 animate-[slideUp_0.35s_ease-out]">
        Upload Video
      </h1>

      {/* FILE SELECT */}
      <div
        className="bg-white border-2 border-dashed rounded-xl p-10
        text-center mb-6 animate-[cardIn_0.35s_ease-out]"
      >
        {!videoFile ? (
          <>
            <Upload className="w-12 h-12 mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600 mb-4">
              Select a video to upload
            </p>
            <label className="bg-blue-600 text-white px-6 py-2 rounded-lg
              cursor-pointer transition hover:bg-blue-700">
              Select Video
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => setVideoFile(e.target.files[0])}
              />
            </label>
          </>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <Video className="text-blue-600" />
            <span className="text-gray-700">
              {videoFile.name}
            </span>
            <button
              onClick={() => setVideoFile(null)}
              className="text-red-500 hover:scale-110 transition"
            >
              <X />
            </button>
          </div>
        )}
      </div>

      {/* THUMBNAIL */}
      <div className="mb-6 animate-[cardIn_0.35s_ease-out]">
        <label className="block font-semibold mb-2">
          Thumbnail
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setThumbnail(e.target.files[0])}
        />
      </div>

      {/* TITLE */}
      <div className="mb-6 animate-[cardIn_0.35s_ease-out]">
        <label className="block font-semibold mb-2">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-4 py-2"
          placeholder="Enter video title"
        />
      </div>

      {/* DESCRIPTION */}
      <div className="mb-6 animate-[cardIn_0.35s_ease-out]">
        <label className="block font-semibold mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded px-4 py-2"
          rows={4}
          placeholder="Describe your video"
        />
      </div>

      {error && (
        <p className="text-red-600 mb-4 animate-[fadeIn_0.3s_ease-out]">
          {error}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg
        transition hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload Video"}
      </button>
    </div>
  );
};

export default UploadPage;
