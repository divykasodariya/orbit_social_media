export function calculateVideoScore(video) {
  const ageInDays = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyFactor = Math.pow(0.5, ageInDays / 7);

  const views = video.views || 0;
  const likes = video.likesCount || 0;
  const comments = video.commentsCount || 0;
  const avgWatchRatio = video.totalWatchTime && views > 0 && video.duration > 0
    ? Math.min(1.0, video.totalWatchTime / (views * video.duration))
    : 0.5;

  const engagementScore = (views * 0.2) + (likes * 1.0) + (comments * 2.5) + (avgWatchRatio * 50);

  return engagementScore * recencyFactor;
}

export function getRankedVideos(videoList) {
  return [...videoList]
    .map((video) => ({
      ...video,
      rankingScore: calculateVideoScore(video),
    }))
    .sort((a, b) => b.rankingScore - a.rankingScore);
}
