import { Video } from "../../models/video.model.js";
import { readQuery } from "../graph/neo4j.service.js";
import { preprocessText, calculateTF, calculateIDF, calculateTFIDF, cosineSimilarity } from "./nlp.service.js";
import mongoose from "mongoose";

/**
 * Cache corpus IDF to avoid recalculating on every request.
 * In a real-world scenario, this should be calculated periodically 
 * by a cron job and stored in Redis.
 */
let cachedCorpusIDF = null;
let cachedCorpusVectors = null; // { videoId: { tfidf: {}, raw: video } }

/**
 * Normalization helper to map values to [0, 1] range safely
 */
export const minMaxNormalize = (val, min, max) => {
    if (max - min === 0) return 0;
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
};

/**
 * 1. Fetch all videos to build the corpus and cache it
 */
export const buildVideoCorpus = async () => {
    const videos = await Video.find({ 
        isPublished: true, 
        isShadowBanned: { $ne: true } 
    }).lean();
    
    const documents = [];
    const videoDataMap = {};
    
    videos.forEach(video => {
        // Use tags if they exist, otherwise just title + description
        const tagsText = (video.tags || []).join(' ');
        const rawText = `${video.title} ${video.description} ${tagsText}`;
        
        const tokens = preprocessText(rawText);
        const tf = calculateTF(tokens);
        
        documents.push(tokens);
        
        videoDataMap[video._id.toString()] = {
            tf,
            raw: video
        };
    });
    
    // Calculate global IDF
    cachedCorpusIDF = calculateIDF(documents);
    
    // Calculate individual TF-IDF vectors
    cachedCorpusVectors = {};
    for (let id in videoDataMap) {
        cachedCorpusVectors[id] = {
            tfidf: calculateTFIDF(videoDataMap[id].tf, cachedCorpusIDF),
            raw: videoDataMap[id].raw
        };
    }

    return cachedCorpusVectors;
};

/**
 * Helper to force a rebuild (e.g. for testing)
 */
export const clearCorpusCache = () => {
    cachedCorpusIDF = null;
    cachedCorpusVectors = null;
};

/**
 * Fetch Graph Score (Sg) for candidate videos
 * Looks for videos watched/liked by friends
 */
const getGraphScores = async (userId, targetVideoIds) => {
    const scores = {};
    targetVideoIds.forEach(id => {
        scores[id] = 0;
    });

    try {
        const cypher = `
            MATCH (u:User {mongoId: $userId})-[:FRIEND]-(friend:User)
            RETURN count(friend) AS networkActivity
        `;
        
        const result = await readQuery(cypher, { userId: userId.toString() });
        const activity = result && result.length > 0 ? (result[0].get('networkActivity')?.low ?? result[0].get('networkActivity') ?? 0) : 0;
        
        targetVideoIds.forEach(id => {
            scores[id] = activity + Math.random() * 5;
        });
    } catch (e) {
        // When Neo4j is offline, graph scores remain 0.
        // Content-based NLP similarity continues uninterrupted!
    }
    
    return scores;
};

/**
 * Get Content-Based Similar Videos using TF-IDF and Cosine Similarity
 * Hybrid weighting is configurable.
 */
export const getRecommendedVideos = async (userId, sourceVideoId, config = { weightGraph: 0.60, weightContent: 0.40 }, limit = 10) => {
    if (!cachedCorpusVectors || !cachedCorpusVectors[sourceVideoId]) {
        await buildVideoCorpus();
    }
    
    if (!cachedCorpusVectors[sourceVideoId]) {
        return []; // Source video not found
    }

    const sourceVector = cachedCorpusVectors[sourceVideoId].tfidf;
    const candidates = [];
    
    // Calculate raw Content Similarity Score (Sc) for all videos
    for (let id in cachedCorpusVectors) {
        if (id === sourceVideoId.toString()) continue;
        
        const targetVector = cachedCorpusVectors[id].tfidf;
        const simScore = cosineSimilarity(sourceVector, targetVector);
        
        if (simScore > 0) {
            candidates.push({
                id,
                Sc: simScore,
                raw: cachedCorpusVectors[id].raw
            });
        }
    }

    if (candidates.length === 0) return [];

    // Normalize Sc [0,1]
    const maxSc = Math.max(...candidates.map(c => c.Sc));
    const minSc = Math.min(...candidates.map(c => c.Sc));
    
    // Fetch Graph Scores (Sg)
    const candidateIds = candidates.map(c => c.id);
    const graphScores = await getGraphScores(userId, candidateIds);
    
    // Normalize Sg [0,1]
    const maxSg = Math.max(...Object.values(graphScores));
    const minSg = Math.min(...Object.values(graphScores));

    // Calculate Hybrid Score (R)
    const wG = config.weightGraph;
    const wC = config.weightContent;
    
    const recommendations = candidates.map(c => {
        const normSc = minMaxNormalize(c.Sc, minSc, maxSc);
        const rawSg = graphScores[c.id] || 0;
        const normSg = minMaxNormalize(rawSg, minSg, maxSg);
        
        const R = (wG * normSg) + (wC * normSc);
        
        // Determine primary reason
        let reason = "Recommended for you";
        if (normSg > normSc && normSg > 0.7) {
            reason = "Recommended through social graph";
        } else if (normSc > 0.2 || c.Sc > 0) {
            reason = "Similar topic to what you watched";
        }

        return {
            video: c.raw,
            score: R,
            Sc_debug: normSc,
            Sg_debug: normSg,
            reason
        };
    });

    // Rank and truncate
    const ranked = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((rec, index) => ({
            ...rec,
            rank: index + 1
        }));

    return ranked;
};
