import test from 'node:test';
import assert from 'node:assert';
import { calculateHotScore, applyHotSortIfRequired } from '../services/ranking.service.js';
import { voteThread } from '../controllers/thread.controller.js';
import { Thread } from '../models/thread.model.js';
import { ThreadVote } from '../models/threadVote.model.js';

test('Thread Subsystem', async (t) => {

    await t.test('calculateHotScore - scoring formula', () => {
        // Newer item should have higher score than older item with same points
        const score1 = calculateHotScore(10, new Date().toISOString());
        
        const oldDate = new Date();
        oldDate.setHours(oldDate.getHours() - 10);
        const score2 = calculateHotScore(10, oldDate.toISOString());

        assert.ok(score1 > score2, 'Newer items should be hotter');
    });

    await t.test('applyHotSortIfRequired - should build sort aggregate', () => {
        const sortHot = applyHotSortIfRequired('hot');
        assert.ok(sortHot, 'Should return sort pipeline step');
        assert.strictEqual(sortHot.$sort.hotness, -1);

        const sortTop = applyHotSortIfRequired('top');
        assert.strictEqual(sortTop, null, 'Should return null for non-hot sorts');
    });

    const mockRes = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.data = data;
            return this;
        }
    };

    await t.test('voteThread - should validate vote values', async () => {
        const mockReq = {
            params: { id: 'thread123' },
            body: { value: 5 }, // Invalid
            user: { _id: 'user123' }
        };

        const error = await new Promise((resolve) => {
            voteThread(mockReq, mockRes, (err) => resolve(err));
        });

        assert.ok(error, 'Should have called next with an error');
        assert.strictEqual(error.statusCode, 400);
        assert.strictEqual(error.message, 'Invalid vote value');
    });

});
