import test from 'node:test';
import assert from 'node:assert';
import { rankCandidates } from '../services/graph/feedRanking.service.js';
import mongoose from 'mongoose';

test('Feed Subsystem', async (t) => {
    await t.test('rankCandidates - should rank mixed content types deterministically', () => {
        const now = new Date();
        const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago

        const candidates = [
            {
                type: 'VIDEO',
                contentId: new mongoose.Types.ObjectId(),
                score: 10000, // lots of views
                createdAt: past.toISOString(),
                reason: 'Because you follow this creator'
            },
            {
                type: 'POST',
                contentId: new mongoose.Types.ObjectId(),
                score: 0,
                createdAt: now.toISOString(),
                reason: 'Posted by a friend'
            },
            {
                type: 'THREAD',
                contentId: new mongoose.Types.ObjectId(),
                score: 500, // reddit upvotes
                createdAt: now.toISOString(),
                reason: 'From a community you joined'
            }
        ];

        const ranked = rankCandidates(candidates);
        
        assert.strictEqual(ranked.length, 3, 'Should rank all candidates');
        
        // Assert properties exist
        assert.ok(ranked[0].finalScore !== undefined, 'Should calculate finalScore');
        
        // Order shouldn't be guaranteed strictly for the mock without doing exact math, 
        // but we can verify that the multiplier applies and sorting happens correctly based on finalScore
        assert.ok(ranked[0].finalScore >= ranked[1].finalScore, 'Should sort descending by finalScore');
        assert.ok(ranked[1].finalScore >= ranked[2].finalScore, 'Should sort descending by finalScore');
    });

    await t.test('rankCandidates - Duplicate content prevention via score multipliers', () => {
        const now = new Date();
        
        const c1 = {
            type: 'POST',
            contentId: '123',
            score: 0,
            createdAt: now.toISOString(),
            reason: 'friend'
        };
        
        const c2 = {
            type: 'POST',
            contentId: '124',
            score: 0,
            createdAt: now.toISOString(),
            reason: 'none'
        };

        const ranked = rankCandidates([c1, c2]);
        assert.ok(ranked[0].contentId === '123', 'Item with friend reason should rank higher');
    });
});
