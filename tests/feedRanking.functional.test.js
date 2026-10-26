import assert from "node:assert";
import { scoreFeedItem, rankFeedCandidates } from "../core-modules/feedRanking.js";

export function runFeedFunctionalTests() {
  const results = [];

  try {
    const item = {
      createdAt: new Date().toISOString(),
      authorId: "user_a",
      communityId: "comm_x",
      likesCount: 10,
      commentsCount: 5,
      sharesCount: 2
    };
    const affinity = {
      friendId: "other_user",
      joinedCommunityIds: []
    };
    const score = scoreFeedItem(item, affinity);
    assert(score > 0, "Score should be positive");
    assert(typeof score === "number", "Score should be a number");
    results.push({ name: "Calculate base feed item engagement score", status: "PASS" });
  } catch (error) {
    results.push({ name: "Calculate base feed item engagement score", status: "FAIL", error: error.message });
  }

  try {
    const post = {
      createdAt: new Date().toISOString(),
      authorId: "friend_123",
      communityId: "comm_general",
      likesCount: 20
    };
    const friendAffinity = { friendId: "friend_123", joinedCommunityIds: [] };
    const strangerAffinity = { friendId: "someone_else", joinedCommunityIds: [] };
    const friendScore = scoreFeedItem(post, friendAffinity);
    const strangerScore = scoreFeedItem(post, strangerAffinity);

    const ratio = friendScore / strangerScore;
    assert(Math.abs(ratio - 2.5) < 0.01, "Friend weight (3.0) / Stranger weight (1.2) should be 2.5");
    results.push({ name: "Apply 3.0x friend relationship multiplier", status: "PASS" });
  } catch (error) {
    results.push({ name: "Apply 3.0x friend relationship multiplier", status: "FAIL", error: error.message });
  }

  try {
    const post = {
      createdAt: new Date().toISOString(),
      authorId: "creator_99",
      communityId: "tech_hub",
      likesCount: 15
    };
    const memberAffinity = { friendId: "none", joinedCommunityIds: ["tech_hub", "gaming"] };
    const nonMemberAffinity = { friendId: "none", joinedCommunityIds: ["gaming"] };
    const memberScore = scoreFeedItem(post, memberAffinity);
    const nonMemberScore = scoreFeedItem(post, nonMemberAffinity);

    const ratio = memberScore / nonMemberScore;
    assert(Math.abs(ratio - 2.5) < 0.01, "Member weight (2.5) / Non-member weight (1.0) should be 2.5");
    results.push({ name: "Apply 2.5x joined community multiplier", status: "PASS" });
  } catch (error) {
    results.push({ name: "Apply 2.5x joined community multiplier", status: "FAIL", error: error.message });
  }

  try {
    const post = {
      createdAt: new Date().toISOString(),
      authorId: "friend_vip",
      communityId: "core_comm",
      likesCount: 50,
      commentsCount: 10
    };
    const fullyConnectedAffinity = {
      friendId: "friend_vip",
      joinedCommunityIds: ["core_comm"]
    };
    const disconnectedAffinity = {
      friendId: "stranger",
      joinedCommunityIds: ["unrelated_comm"]
    };
    const boostedScore = scoreFeedItem(post, fullyConnectedAffinity);
    const normalScore = scoreFeedItem(post, disconnectedAffinity);

    const combinedMultiplier = boostedScore / normalScore;
    assert(Math.abs(combinedMultiplier - 6.25) < 0.01, "(3.0 * 2.5) / (1.2 * 1.0) must equal 6.25");
    results.push({ name: "Calculate combined friend and community multiplier", status: "PASS" });
  } catch (error) {
    results.push({ name: "Calculate combined friend and community multiplier", status: "FAIL", error: error.message });
  }

  try {
    const candidates = [
      { id: "post_1", createdAt: new Date().toISOString(), authorId: "user_1", likesCount: 5 },
      { id: "post_2", createdAt: new Date().toISOString(), authorId: "friend_id", likesCount: 50 },
      { id: "post_3", createdAt: new Date().toISOString(), authorId: "user_3", likesCount: 20 }
    ];
    const affinity = { friendId: "friend_id", joinedCommunityIds: [] };
    const ranked = rankFeedCandidates(candidates, affinity);

    assert.strictEqual(ranked[0].id, "post_2", "Post by friend with high likes should rank first");
    assert(ranked[0].score >= ranked[1].score, "Post 1 score must be >= Post 2");
    assert(ranked[1].score >= ranked[2].score, "Post 2 score must be >= Post 3");
    results.push({ name: "Sort candidate feed items in descending score order", status: "PASS" });
  } catch (error) {
    results.push({ name: "Sort candidate feed items in descending score order", status: "FAIL", error: error.message });
  }

  return results;
}

if (process.argv[1].endsWith("feedRanking.functional.test.js")) {
  const tests = runFeedFunctionalTests();
  console.log("=== Feed Ranking Functional Tests ===");
  tests.forEach((t) => console.log(`[${t.status}] ${t.name}${t.error ? ": " + t.error : ""}`));
}
