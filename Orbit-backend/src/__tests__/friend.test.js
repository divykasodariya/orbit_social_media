import test from 'node:test';
import assert from 'node:assert';
import { sendFriendRequest, acceptFriendRequest, getFriends } from '../controllers/friend.controller.js';
import { FriendRequest } from '../models/friendRequest.model.js';
import { User } from '../models/user.model.js';
import { addFriend } from '../services/graph/relationshipGraph.service.js';
import { ApiError } from '../utils/ApiError.js';

test('Friendship Subsystem Controllers', async (t) => {
    
    // Minimal mock for request/response
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

    await t.test('sendFriendRequest - should block self-request', async () => {
        const mockReq = {
            params: { userId: '123' },
            user: { _id: '123' }
        };

        const error = await new Promise((resolve) => {
            sendFriendRequest(mockReq, mockRes, (err) => resolve(err));
        });

        assert.ok(error, 'Should have called next with an error');
        assert.strictEqual(error.statusCode, 400);
        assert.strictEqual(error.message, 'You cannot send a friend request to yourself');
    });
    
    await t.test('acceptFriendRequest - should validate ownership', async () => {
        const originalFindById = FriendRequest.findById;
        FriendRequest.findById = async (id) => ({
            _id: id,
            receiver: 'receiver_id',
            sender: 'sender_id',
            status: 'PENDING'
        });

        const mockReq = {
            params: { requestId: 'req_1' },
            user: { _id: 'wrong_receiver_id' }
        };

        const error = await new Promise((resolve) => {
            acceptFriendRequest(mockReq, mockRes, (err) => resolve(err));
        });

        assert.ok(error, 'Should have called next with an error');
        assert.strictEqual(error.statusCode, 403);
        assert.strictEqual(error.message, 'You are not authorized to accept this request');

        FriendRequest.findById = originalFindById;
    });

    await t.test('Integration check - all exports present', () => {
        assert.ok(sendFriendRequest, 'sendFriendRequest exists');
        assert.ok(acceptFriendRequest, 'acceptFriendRequest exists');
        assert.ok(getFriends, 'getFriends exists');
    });

});
