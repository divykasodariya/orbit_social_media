/**
 * Calculates the 'hot' score of a thread.
 * Reddit's hot algorithm generally relies on logarithmic scaling of score and time decay.
 * Here we provide a simplified but effective version that can be used in sorting.
 */
export const calculateHotScore = (score, createdAt) => {
    // Basic Hacker News / Reddit inspired hot algorithm
    // (P - 1) / (T + 2)^G
    // P = points of an item
    // T = time since submission (in hours)
    // G = Gravity (default 1.8)
    
    const points = Math.max(score, 0); // Don't let negative scores create weird hotness
    const ageInHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    const gravity = 1.8;
    
    return points / Math.pow(ageInHours + 2, gravity);
};

/**
 * Builds the MongoDB aggregation sort pipeline based on the requested sort type
 */
export const getThreadSortPipeline = (sortType) => {
    switch (sortType) {
        case "top":
            return { $sort: { score: -1, createdAt: -1 } };
        case "new":
            return { $sort: { createdAt: -1 } };
        case "hot":
        default:
            // For Hot, we can either calculate it on the fly via aggregate fields
            // or pre-calculate it periodically.
            // On the fly aggregation:
            return {
                $addFields: {
                    hotness: {
                        $divide: [
                            { $max: ["$score", 0] },
                            {
                                $pow: [
                                    {
                                        $add: [
                                            { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000] }, // Age in hours
                                            2
                                        ]
                                    },
                                    1.8
                                ]
                            }
                        ]
                    }
                }
            };
    }
};

export const applyHotSortIfRequired = (sortType) => {
    if (sortType === "hot" || !sortType) {
        return { $sort: { hotness: -1 } };
    }
    return null; // Already handled by getThreadSortPipeline for others
};
