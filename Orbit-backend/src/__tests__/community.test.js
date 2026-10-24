import test from 'node:test';
import assert from 'node:assert';
import { createCommunity, leaveCommunityHandler } from '../controllers/community.controller.js';
import { Community } from '../models/community.model.js';
import { CommunityMembership } from '../models/communityMembership.model.js';

test('Community Subsystem Controllers', async (t) => {
    
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

    await t.test('createCommunity - requires name and slug', async () => {
        const mockReq = {
            body: { name: 'Test' }, // missing slug
            user: { _id: 'user123' }
        };

        const error = await new Promise((resolve) => {
            createCommunity(mockReq, mockRes, (err) => resolve(err));
        });

        assert.ok(error, 'Should have called next with an error');
        assert.strictEqual(error.statusCode, 400);
        assert.strictEqual(error.message, 'Name and slug are required');
    });

    await t.test('leaveCommunityHandler - should block last owner from leaving', async () => {
        // Mock mongoose models
        const origCommunityMembershipFindOne = CommunityMembership.findOne;
        const origCommunityMembershipCount = CommunityMembership.countDocuments;

        CommunityMembership.findOne = async () => ({
            _id: 'membership123',
            userId: 'user123',
            communityId: 'comm123',
            role: 'OWNER'
        });

        CommunityMembership.countDocuments = async () => 1; // Only 1 owner

        const mockReq = {
            params: { id: 'comm123' },
            user: { _id: 'user123' }
        };

        const error = await new Promise((resolve) => {
            leaveCommunityHandler(mockReq, mockRes, (err) => resolve(err));
        });

        assert.ok(error, 'Should have called next with an error');
        assert.strictEqual(error.statusCode, 400);
        assert.strictEqual(error.message, 'The last owner cannot leave the community. Transfer ownership or delete the community.');

        // Cleanup mocks
        CommunityMembership.findOne = origCommunityMembershipFindOne;
        CommunityMembership.countDocuments = origCommunityMembershipCount;
    });

});
