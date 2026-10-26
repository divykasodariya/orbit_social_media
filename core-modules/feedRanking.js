export function scoreFeedItem(item, userAffinity) {
  const ageInHours = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
  const timeDecay = Math.exp(-0.05 * ageInHours);

  const relationshipWeight = item.authorId === userAffinity.friendId ? 3.0 : 1.2;
  const communityWeight = userAffinity.joinedCommunityIds?.includes(item.communityId) ? 2.5 : 1.0;

  const engagementScore =
    (item.likesCount || 0) * 1.5 +
    (item.commentsCount || 0) * 2.0 +
    (item.sharesCount || 0) * 3.0;

  return (engagementScore + 1) * relationshipWeight * communityWeight * timeDecay;
}

export function rankFeedCandidates(candidates, userAffinity) {
  return candidates
    .map((item) => ({
      ...item,
      score: scoreFeedItem(item, userAffinity),
    }))
    .sort((a, b) => b.score - a.score);
}
