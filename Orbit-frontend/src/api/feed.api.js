import axiosInstance from "../utils/axiosConfig";

export const getUnifiedFeed = async (cursor = "", limit = 20) => {
  return await axiosInstance.get(`/feed?cursor=${cursor}&limit=${limit}`);
};
