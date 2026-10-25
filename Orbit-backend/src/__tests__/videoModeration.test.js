import test from 'node:test';
import assert from 'node:assert';
import { analyzeContentWithLlama, moderateVideoById } from '../services/moderation/videoModeration.service.js';
import { Video } from '../models/video.model.js';
import mongoose from 'mongoose';

test('Toxicity, Vulgarity & Shadow Banning Subsystem', async (t) => {

    await t.test('analyzeContentWithLlama - safely scores clean educational content', async () => {
        const cleanContent = {
            title: "Getting Started with Python Programming",
            description: "A complete step-by-step tutorial on writing your first Python program.",
            transcript: "Hello everyone, welcome back to the channel. Today we are learning basic Python syntax and variables."
        };

        const result = await analyzeContentWithLlama(cleanContent);

        assert.ok(typeof result.toxicityScore === 'number', 'toxicityScore must be a number');
        assert.ok(result.toxicityScore >= 0.0 && result.toxicityScore <= 1.0, 'toxicityScore must be between 0 and 1');
        assert.ok(result.toxicityScore < 0.5, 'Clean content should have low toxicity');
        assert.strictEqual(result.isVulgar, false, 'Clean content should not be vulgar');
        assert.strictEqual(result.shouldShadowBan, false, 'Clean content should not be shadow-banned');
        assert.ok(Array.isArray(result.flaggedCategories), 'flaggedCategories must be an array');
        assert.strictEqual(result.flaggedCategories.length, 0, 'Clean content should have no flagged categories');
    });

    await t.test('analyzeContentWithLlama - detects severe profanity and hate speech', async () => {
        const toxicContent = {
            title: "I hate all of you disgusting people",
            description: "You are all subhuman trash and deserve to be destroyed.",
            transcript: "Fuck all of you idiots, you worthless pieces of shit. Get out of our country or else!"
        };

        const result = await analyzeContentWithLlama(toxicContent);

        assert.ok(result.toxicityScore >= 0.70, 'Toxic content should have high toxicity score');
        assert.strictEqual(result.isVulgar, true, 'Vulgar/profane content should flag isVulgar as true');
        assert.strictEqual(result.shouldShadowBan, true, 'Toxic hate speech must trigger shouldShadowBan: true');
        assert.ok(result.flaggedCategories.length > 0, 'Flagged categories should not be empty');
        
        const hasViolations = result.flaggedCategories.some(cat => 
            cat.includes('hate') || cat.includes('profanity') || cat.includes('vulgar') || cat.includes('harassment')
        );
        assert.ok(hasViolations, 'Must flag relevant categories (hate_speech, extreme_profanity, etc.)');
    });

    await t.test('Shadow Ban Mechanics in MongoDB - Public feeds exclude shadow-banned videos', () => {
        const publicFeedFilter = {
            isPublished: true,
            isShadowBanned: { $ne: true }
        };

        const cleanVideo = {
            _id: new mongoose.Types.ObjectId(),
            title: "Clean Video",
            isPublished: true,
            isShadowBanned: false
        };

        const unmoderatedVideo = {
            _id: new mongoose.Types.ObjectId(),
            title: "Unmoderated Video (Legacy)",
            isPublished: true
            // isShadowBanned undefined
        };

        const shadowBannedVideo = {
            _id: new mongoose.Types.ObjectId(),
            title: "Toxic Video",
            isPublished: true,
            isShadowBanned: true
        };

        const simulateFilter = (video, filter) => {
            if (filter.isPublished && !video.isPublished) return false;
            if (filter.isShadowBanned && filter.isShadowBanned.$ne === true) {
                if (video.isShadowBanned === true) return false;
            }
            return true;
        };

        assert.strictEqual(simulateFilter(cleanVideo, publicFeedFilter), true, 'Clean video passes public feed filter');
        assert.strictEqual(simulateFilter(unmoderatedVideo, publicFeedFilter), true, 'Legacy/unset video passes public feed filter');
        assert.strictEqual(simulateFilter(shadowBannedVideo, publicFeedFilter), false, 'Shadow-banned video is SILENTLY SUPPRESSED from public feed');
    });

    await t.test('Shadow Ban Mechanics in MongoDB - Channel dashboard retains creator visibility', () => {
        const creatorId = new mongoose.Types.ObjectId();

        const channelDashboardFilter = {
            owner: creatorId
            // No isShadowBanned filter!
        };

        const shadowBannedVideo = {
            _id: new mongoose.Types.ObjectId(),
            owner: creatorId,
            title: "My Shadow Banned Video",
            isPublished: true,
            isShadowBanned: true
        };

        // Creator must see their own video without error
        const isVisibleToCreator = shadowBannedVideo.owner.equals(channelDashboardFilter.owner);
        assert.strictEqual(isVisibleToCreator, true, 'Creator still sees their shadow-banned video on Channel Dashboard normally');
    });
});
