import test from 'node:test';
import assert from 'node:assert';
import { 
    preprocessText, 
    calculateTF, 
    calculateIDF, 
    calculateTFIDF, 
    cosineSimilarity 
} from '../services/recommendation/nlp.service.js';
import { 
    minMaxNormalize, 
    clearCorpusCache, 
    getRecommendedVideos,
    buildVideoCorpus
} from '../services/recommendation/videoRecommendation.service.js';
import mongoose from 'mongoose';
import { Video } from '../models/video.model.js';

test('Video Recommendation & NLP Subsystem', async (t) => {
    
    await t.test('preprocessText - lowercase, remove punctuation, stop words, tokenize', () => {
        const text = "Hello, world! This is A TEST. The cats are running fast.";
        const tokens = preprocessText(text);
        
        assert.ok(!tokens.includes('the'), 'Stop word "the" should be removed');
        assert.ok(!tokens.includes('is'), 'Stop word "is" should be removed');
        assert.ok(tokens.includes('hello'), 'Should be lowercased');
        assert.ok(!tokens.includes('world!'), 'Punctuation should be stripped');
        assert.ok(tokens.includes('world'), 'Token should be clean');
    });

    await t.test('TF Calculation', () => {
        const tokens = ['apple', 'apple', 'banana'];
        const tf = calculateTF(tokens);
        
        assert.strictEqual(tf['apple'], 2 / 3);
        assert.strictEqual(tf['banana'], 1 / 3);
    });

    await t.test('IDF and TF-IDF Calculation', () => {
        const corpus = [
            ['apple', 'banana'],
            ['apple', 'orange'],
            ['banana', 'kiwi']
        ];
        
        const idf = calculateIDF(corpus);
        assert.ok(idf['apple'] > 0);
        
        const tf1 = calculateTF(corpus[0]);
        const tfidf1 = calculateTFIDF(tf1, idf);
        
        assert.ok(tfidf1['apple'] > 0);
        assert.ok(tfidf1['banana'] > 0);
    });

    await t.test('Cosine Similarity', () => {
        // Orthogonal vectors
        const vec1 = { a: 1, b: 0 };
        const vec2 = { a: 0, b: 1 };
        assert.strictEqual(cosineSimilarity(vec1, vec2), 0);

        // Identical vectors
        const vec3 = { a: 1, b: 1 };
        // JS floating point precision check
        assert.ok(Math.abs(cosineSimilarity(vec3, vec3) - 1.0) < 0.0001);

        // Partial match
        const vec4 = { a: 1, b: 1 };
        const vec5 = { a: 1, b: 0 };
        const sim = cosineSimilarity(vec4, vec5);
        assert.ok(sim > 0 && sim < 1);
    });

    await t.test('minMaxNormalize', () => {
        assert.strictEqual(minMaxNormalize(5, 0, 10), 0.5);
        assert.strictEqual(minMaxNormalize(10, 0, 10), 1);
        assert.strictEqual(minMaxNormalize(-5, 0, 10), 0); // Clipped to 0
        assert.strictEqual(minMaxNormalize(5, 5, 5), 0); // Div by zero protection
    });

    await t.test('Hybrid Recommendation Pipeline (Offline Mock Dataset)', async () => {
        clearCorpusCache();

        // Setup mock videos
        const origFind = Video.find;
        
        const mockVideos = [
            {
                _id: new mongoose.Types.ObjectId().toString(),
                title: "React Tutorial for Beginners",
                description: "Learn React frontend development from scratch.",
                isPublished: true,
                tags: ['react', 'javascript']
            },
            {
                _id: new mongoose.Types.ObjectId().toString(),
                title: "Advanced React Hooks",
                description: "Master React hooks and state management.",
                isPublished: true,
                tags: ['react', 'advanced']
            },
            {
                _id: new mongoose.Types.ObjectId().toString(),
                title: "Healthy Cooking 101",
                description: "Learn to cook healthy meals quickly.",
                isPublished: true,
                tags: ['cooking', 'food']
            }
        ];
        
        Video.find = () => ({
            lean: () => Promise.resolve(mockVideos)
        });

        const start = performance.now();

        // Execute recommendation for video 0 (React Tutorial)
        const targetUserId = 'user123';
        const sourceVideoId = mockVideos[0]._id;
        
        const recommendations = await getRecommendedVideos(
            targetUserId, 
            sourceVideoId, 
            { weightGraph: 0.0, weightContent: 1.0 }, // Test pure content similarity first
            10
        );

        const end = performance.now();
        const duration = end - start;

        assert.ok(duration < 50, 'Recommendation pipeline should be fast (benchmark)');
        
        // Assertions
        assert.ok(recommendations.length > 0, 'Should return recommendations');
        
        // Video 1 (Advanced React) should be ranked higher than Video 2 (Cooking)
        const reactRec = recommendations.find(r => r.video._id === mockVideos[1]._id);
        const cookingRec = recommendations.find(r => r.video._id === mockVideos[2]._id);
        
        assert.ok(reactRec, 'React video should be in recommendations');
        
        if (cookingRec) {
            assert.ok(reactRec.score > cookingRec.score, 'Content similarity should rank React higher than Cooking');
        }

        // Cleanup
        Video.find = origFind;
        clearCorpusCache();
    });
});
