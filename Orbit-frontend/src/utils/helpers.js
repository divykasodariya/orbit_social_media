// src/utils/helpers.js

/* ---------------- FORMAT DATE ---------------- */
export const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/* ---------------- FORMAT VIEWS ---------------- */
export const formatViews = (views = 0) => {
  if (views < 1000) return views;
  if (views < 1_000_000) return `${(views / 1000).toFixed(1)}K`;
  if (views < 1_000_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  return `${(views / 1_000_000_000).toFixed(1)}B`;
};

/* ---------------- FORMAT DURATION ---------------- */
export const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/* ---------------- FORMAT SUBSCRIBERS ---------------- */
export const formatSubscribers = (count = 0) => {
  if (count < 1000) return count;
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1_000_000).toFixed(1)}M`;
};

/* ---------------- TIME AGO ---------------- */
export const timeAgo = (date) => {
  if (!date) return "";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

