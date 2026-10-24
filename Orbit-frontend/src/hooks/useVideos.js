import { useState } from "react";
import {
  getAllVideos,
  getVideoById,
  uploadVideo
} from "../api/video.api";

export const useVideos = () => {
  const [videos, setVideos] = useState([]);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchVideos = async (params) => {
    setLoading(true);
    const res = await getAllVideos(params);
    setVideos(res.data.data.docs);
    setLoading(false);
  };

  const fetchVideoById = async (id) => {
    const res = await getVideoById(id);
    setVideo(res.data.data);
  };

  const publish = async (formData) => {
    await uploadVideo(formData);
  };

  return {
    videos,
    video,
    loading,
    fetchVideos,
    fetchVideoById,
    publish
  };
};
