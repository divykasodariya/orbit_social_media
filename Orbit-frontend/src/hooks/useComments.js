import { useState } from "react";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
} from "../api/comment.api";

export const useComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComments = async (videoId, params) => {
    setLoading(true);
    try {
      const res = await getVideoComments(videoId, params);
      setComments(res.data.data.docs);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createComment = async (videoId, content) => {
    const res = await addComment(videoId, { content });
    setComments(prev => [...prev, res.data.data]);
  };

  const editComment = async (commentId, content) => {
    const res = await updateComment(commentId, { updateContent: content });
    setComments(prev =>
      prev.map(c => (c._id === commentId ? res.data.data : c))
    );
  };

  const removeComment = async (commentId) => {
    await deleteComment(commentId);
    setComments(prev => prev.filter(c => c._id !== commentId));
  };

  return {
    comments,
    loading,
    error,
    fetchComments,
    createComment,
    editComment,
    removeComment
  };
};
