/**
 * Calculates a unified ranking score for heterogeneous items.
 * 
 * Factors:
 * - Age Decay (newer = higher score)
 * - Base Score/Views (normalized slightly so 1000 views != 1000 upvotes)
 * - Source Weight (Friend > Subscribed > Joined > Popular)
 */
export const rankCandidates = (candidates) => {
    const now = Date.now();

    return candidates.map(item => {
        const ageHours = Math.max(0.1, (now - new Date(item.createdAt).getTime()) / (1000 * 60 * 60));
        
        let scoreWeight = item.score;
        
        // Normalize video views down so they don't immediately dwarf reddit-style upvotes
        if (item.type === 'VIDEO') {
            scoreWeight = Math.log10(Math.max(1, item.score)) * 10; 
        } else if (item.type === 'POST') {
            // Posts (Tweets) don't have a score out of the box in Orbit, give a flat bump if from friends
            scoreWeight = 5;
        }

        // Apply reason multiplier
        let reasonMultiplier = 1.0;
        if (item.reason.includes("friend")) reasonMultiplier = 2.0;
        else if (item.reason.includes("follow")) reasonMultiplier = 1.5;
        else if (item.reason.includes("community")) reasonMultiplier = 1.3;

        // HackerNews-style gravity decay
        const gravity = 1.5;
        const finalScore = (Math.max(scoreWeight, 0) + 1) * reasonMultiplier / Math.pow(ageHours + 2, gravity);

        return { ...item, finalScore };
    }).sort((a, b) => b.finalScore - a.finalScore);
};
