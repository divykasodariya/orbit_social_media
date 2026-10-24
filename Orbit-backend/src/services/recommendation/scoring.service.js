/**
 * Calculate Jaccard similarity for two sets.
 * J(A,B) = |N(A) ∩ N(B)| / |N(A) ∪ N(B)|
 * 
 * @param {Set|Array} setA 
 * @param {Set|Array} setB 
 * @returns {number} Score between 0 and 1
 */
export const calculateJaccardSimilarity = (setA, setB) => {
    const a = new Set(setA);
    const b = new Set(setB);

    if (a.size === 0 && b.size === 0) return 0;

    const intersection = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);

    return intersection.size / union.size;
};
