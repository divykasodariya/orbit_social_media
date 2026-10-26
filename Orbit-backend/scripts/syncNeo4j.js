import mongoose from "mongoose";
import dotenv from "dotenv";
import neo4j from "neo4j-driver";
import { DB_NAME } from "../src/constants.js";
import { Subscription } from "../src/models/subscription.model.js";

dotenv.config();

const syncAllToNeo4j = async () => {
  let driver;
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("✅ Connected to MongoDB");

    console.log("🔌 Connecting to Neo4j...");
    driver = neo4j.driver(
      process.env.NEO4J_URI || "bolt://localhost:7687",
      neo4j.auth.basic(
        process.env.NEO4J_USER || "neo4j",
        process.env.NEO4J_PASSWORD || "password"
      )
    );
    const session = driver.session();
    console.log("✅ Connected to Neo4j");

    // 1. Constraints setup
    console.log("\n📐 Setting up unique constraints...");
    const constraints = [
      "CREATE CONSTRAINT user_mongoId IF NOT EXISTS FOR (u:User) REQUIRE u.mongoId IS UNIQUE",
      "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
      "CREATE CONSTRAINT comm_mongoId IF NOT EXISTS FOR (c:Community) REQUIRE c.mongoId IS UNIQUE",
      "CREATE CONSTRAINT comm_id IF NOT EXISTS FOR (c:Community) REQUIRE c.id IS UNIQUE",
      "CREATE CONSTRAINT video_mongoId IF NOT EXISTS FOR (v:Video) REQUIRE v.mongoId IS UNIQUE",
      "CREATE CONSTRAINT video_id IF NOT EXISTS FOR (v:Video) REQUIRE v.id IS UNIQUE",
      "CREATE CONSTRAINT tweet_mongoId IF NOT EXISTS FOR (t:Tweet) REQUIRE t.mongoId IS UNIQUE",
      "CREATE CONSTRAINT tweet_id IF NOT EXISTS FOR (t:Tweet) REQUIRE t.id IS UNIQUE",
      "CREATE CONSTRAINT thread_mongoId IF NOT EXISTS FOR (th:Thread) REQUIRE th.mongoId IS UNIQUE",
      "CREATE CONSTRAINT thread_id IF NOT EXISTS FOR (th:Thread) REQUIRE th.id IS UNIQUE",
    ];

    for (const c of constraints) {
      await session.run(c);
    }
    console.log("✅ Constraints configured.");

    // 2. Sync Users
    const users = await mongoose.connection.collection("users").find({}).toArray();
    console.log(`\n👤 Syncing ${users.length} Users...`);
    for (const u of users) {
      await session.run(
        `
        MERGE (user:User {mongoId: $mongoId})
        SET user.id = $mongoId,
            user.username = $username,
            user.name = $name,
            user.email = $email,
            user.avatar = $avatar
        `,
        {
          mongoId: u._id.toString(),
          username: u.username || "",
          name: u.fullName || u.username || "",
          email: u.email || "",
          avatar: u.avatar || ""
        }
      );
    }

    // 3. Sync Communities
    const communities = await mongoose.connection.collection("communities").find({}).toArray();
    console.log(`👥 Syncing ${communities.length} Communities...`);
    for (const c of communities) {
      await session.run(
        `
        MERGE (comm:Community {mongoId: $mongoId})
        SET comm.id = $mongoId,
            comm.name = $name,
            comm.slug = $slug,
            comm.description = $description
        `,
        {
          mongoId: c._id.toString(),
          name: c.name || "",
          slug: c.slug || "",
          description: c.description || ""
        }
      );
    }

    // 4. Sync Videos
    const videos = await mongoose.connection.collection("videos").find({}).toArray();
    console.log(`📹 Syncing ${videos.length} Videos...`);
    for (const v of videos) {
      await session.run(
        `
        MERGE (vid:Video {mongoId: $mongoId})
        SET vid.id = $mongoId,
            vid.title = $title,
            vid.description = $description,
            vid.views = $views,
            vid.duration = $duration,
            vid.isPublished = $isPublished
        `,
        {
          mongoId: v._id.toString(),
          title: v.title || "",
          description: v.description || "",
          views: neo4j.int(v.views || 0),
          duration: v.duration || 0,
          isPublished: v.isPublished !== false
        }
      );

      // Rel: User POSTED Video
      if (v.owner) {
        await session.run(
          `
          MATCH (u:User {mongoId: $userId})
          MATCH (v:Video {mongoId: $videoId})
          MERGE (u)-[:POSTED]->(v)
          `,
          {
            userId: v.owner.toString(),
            videoId: v._id.toString()
          }
        );
      }

      // Rel: Users WATCHED Video
      if (Array.isArray(v.viewedBy)) {
        for (const viewerId of v.viewedBy) {
          await session.run(
            `
            MATCH (u:User {mongoId: $userId})
            MATCH (v:Video {mongoId: $videoId})
            MERGE (u)-[:WATCHED]->(v)
            `,
            {
              userId: viewerId.toString(),
              videoId: v._id.toString()
            }
          );
        }
      }
    }

    // 5. Sync Tweets
    const tweets = await mongoose.connection.collection("tweets").find({}).toArray();
    console.log(`💬 Syncing ${tweets.length} Tweets...`);
    for (const t of tweets) {
      await session.run(
        `
        MERGE (tweet:Tweet {mongoId: $mongoId})
        SET tweet.id = $mongoId,
            tweet.content = $content
        `,
        {
          mongoId: t._id.toString(),
          content: t.content || ""
        }
      );

      // Rel: User POSTED Tweet
      if (t.owner) {
        await session.run(
          `
          MATCH (u:User {mongoId: $userId})
          MATCH (t:Tweet {mongoId: $tweetId})
          MERGE (u)-[:POSTED]->(t)
          `,
          {
            userId: t.owner.toString(),
            tweetId: t._id.toString()
          }
        );
      }
    }

    // 6. Sync Threads
    const threads = await mongoose.connection.collection("threads").find({}).toArray();
    console.log(`🧵 Syncing ${threads.length} Community Threads...`);
    for (const th of threads) {
      await session.run(
        `
        MERGE (thread:Thread {mongoId: $mongoId})
        SET thread.id = $mongoId,
            thread.title = $title,
            thread.body = $body,
            thread.score = $score
        `,
        {
          mongoId: th._id.toString(),
          title: th.title || "",
          body: th.body || "",
          score: neo4j.int(th.score || 0)
        }
      );

      // Rel: User POSTED Thread
      if (th.authorId) {
        await session.run(
          `
          MATCH (u:User {mongoId: $userId})
          MATCH (th:Thread {mongoId: $threadId})
          MERGE (u)-[:POSTED]->(th)
          `,
          {
            userId: th.authorId.toString(),
            threadId: th._id.toString()
          }
        );
      }

      // Rel: Thread POSTED_IN Community
      if (th.communityId) {
        await session.run(
          `
          MATCH (th:Thread {mongoId: $threadId})
          MATCH (c:Community {mongoId: $commId})
          MERGE (th)-[:POSTED_IN]->(c)
          `,
          {
            threadId: th._id.toString(),
            commId: th.communityId.toString()
          }
        );
      }
    }

    // 7. Sync Community Memberships (MEMBER_OF)
    const memberships = await mongoose.connection.collection("communitymemberships").find({}).toArray();
    console.log(`🤝 Syncing ${memberships.length} Community Memberships...`);
    for (const m of memberships) {
      await session.run(
        `
        MATCH (u:User {mongoId: $userId})
        MATCH (c:Community {mongoId: $commId})
        MERGE (u)-[r:MEMBER_OF]->(c)
        SET r.role = $role, r.status = $status
        `,
        {
          userId: m.userId.toString(),
          commId: m.communityId.toString(),
          role: m.role || "MEMBER",
          status: m.status || "APPROVED"
        }
      );
    }

    // 8. Sync Friend Requests (FRIEND and FRIEND_WITH)
    // Clear existing friendship edges first to prevent duplicates on re-sync
    await session.run("MATCH ()-[r:FRIEND]->() DELETE r");
    await session.run("MATCH ()-[r:FRIEND_WITH]->() DELETE r");
    const friends = await mongoose.connection.collection("friendrequests").find({ status: "ACCEPTED" }).toArray();
    console.log(`👫 Syncing ${friends.length} Friendships (cleared duplicates first)...`);
    for (const f of friends) {
      await session.run(
        `
        MATCH (u1:User {mongoId: $s})
        MATCH (u2:User {mongoId: $r})
        MERGE (u1)-[:FRIEND]->(u2)
        MERGE (u2)-[:FRIEND]->(u1)
        MERGE (u1)-[:FRIEND_WITH]->(u2)
        MERGE (u2)-[:FRIEND_WITH]->(u1)
        `,
        {
          s: f.sender.toString(),
          r: f.receiver.toString()
        }
      );
    }

    // 9. Sync Likes (LIKED)
    const likes = await mongoose.connection.collection("likes").find({}).toArray();
    console.log(`❤️  Syncing ${likes.length} Likes...`);
    for (const l of likes) {
      if (!l.likedBy) continue;
      const userId = l.likedBy.toString();

      if (l.video) {
        await session.run(
          `
          MATCH (u:User {mongoId: $userId})
          MATCH (v:Video {mongoId: $targetId})
          MERGE (u)-[:LIKED]->(v)
          `,
          { userId, targetId: l.video.toString() }
        );
      } else if (l.tweet) {
        await session.run(
          `
          MATCH (u:User {mongoId: $userId})
          MATCH (t:Tweet {mongoId: $targetId})
          MERGE (u)-[:LIKED]->(t)
          `,
          { userId, targetId: l.tweet.toString() }
        );
      }
    }

    // 10. Sync Comments (COMMENTED_ON)
    const comments = await mongoose.connection.collection("comments").find({}).toArray();
    console.log(`💬 Syncing ${comments.length} Comments...`);
    for (const c of comments) {
      if (!c.owner) continue;
      const userId = c.owner.toString();

      if (c.video) {
        await session.run(
          `
          MATCH (u:User {mongoId: $userId})
          MATCH (v:Video {mongoId: $targetId})
          MERGE (u)-[r:COMMENTED_ON]->(v)
          SET r.content = $content
          `,
          { userId, targetId: c.video.toString(), content: c.content || "" }
        );
      } else if (c.tweet) {
        await session.run(
          `
          MATCH (u:User {mongoId: $userId})
          MATCH (t:Tweet {mongoId: $targetId})
          MERGE (u)-[r:COMMENTED_ON]->(t)
          SET r.content = $content
          `,
          { userId, targetId: c.tweet.toString(), content: c.content || "" }
        );
      }
    }

    // 11. Sync Thread Votes (VOTED)
    const votes = await mongoose.connection.collection("threadvotes").find({}).toArray();
    console.log(`🗳️  Syncing ${votes.length} Thread Votes...`);
    for (const v of votes) {
      if (!v.userId || !v.threadId) continue;
      await session.run(
        `
        MATCH (u:User {mongoId: $userId})
        MATCH (th:Thread {mongoId: $threadId})
        MERGE (u)-[r:VOTED]->(th)
        SET r.value = $value
        `,
        {
          userId: v.userId.toString(),
          threadId: v.threadId.toString(),
          value: neo4j.int(v.value || 1)
        }
      );
    }

    // 12. Subscriptions / Follows (Seed if 0 in MongoDB)
    let subCount = await mongoose.connection.collection("subscriptions").countDocuments();
    if (subCount === 0 && users.length > 2) {
      console.log(`\n🌱 MongoDB has 0 subscriptions. Seeding realistic follows...`);
      // Creator follows: everyone follows the creators who published videos/tweets
      const creatorIds = [
        ...new Set([
          ...videos.map(v => v.owner?.toString()).filter(Boolean),
          ...tweets.map(t => t.owner?.toString()).filter(Boolean)
        ])
      ];

      for (const u of users) {
        const uId = u._id.toString();
        for (const cId of creatorIds) {
          if (uId !== cId) {
            await Subscription.create({
              subscriber: new mongoose.Types.ObjectId(uId),
              channel: new mongoose.Types.ObjectId(cId)
            });
          }
        }
      }
      subCount = await mongoose.connection.collection("subscriptions").countDocuments();
      console.log(`Created ${subCount} subscriptions in MongoDB.`);
    }

    // Sync all Subscriptions to Neo4j FOLLOWS
    const subscriptions = await mongoose.connection.collection("subscriptions").find({}).toArray();
    console.log(`🔔 Syncing ${subscriptions.length} Subscriptions (FOLLOWS)...`);
    for (const s of subscriptions) {
      await session.run(
        `
        MATCH (u1:User {mongoId: $sub})
        MATCH (u2:User {mongoId: $chan})
        MERGE (u1)-[:FOLLOWS]->(u2)
        `,
        {
          sub: s.subscriber.toString(),
          chan: s.channel.toString()
        }
      );
    }

    // Summary Statistics
    const nodeTotal = await session.run("MATCH (n) RETURN count(n) AS c");
    const relTotal = await session.run("MATCH ()-[r]->() RETURN count(r) AS c");
    const labelsRes = await session.run("CALL db.labels() YIELD label RETURN label");
    const relTypesRes = await session.run("CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType");

    console.log("\n==================================================");
    console.log("🎉 COMPLETE NEO4J GRAPH POPULATION SUCCESSFUL!");
    console.log(`📊 Total Nodes in Neo4j:         ${nodeTotal.records[0].get("c").toString()}`);
    console.log(`🔗 Total Relationships in Neo4j: ${relTotal.records[0].get("c").toString()}`);
    console.log(`🏷️  Node Labels:                  ${labelsRes.records.map(r => r.get("label")).join(", ")}`);
    console.log(`⚡ Relationship Types:          ${relTypesRes.records.map(r => r.get("relationshipType")).join(", ")}`);
    console.log("==================================================\n");

    await session.close();
  } catch (error) {
    console.error("❌ Sync Error:", error);
  } finally {
    if (driver) await driver.close();
    await mongoose.disconnect();
    process.exit(0);
  }
};

syncAllToNeo4j();
