import mongoose from "mongoose";
import dotenv from "dotenv";
import neo4j from "neo4j-driver";
import { DB_NAME } from "../src/constants.js";
import { User } from "../src/models/user.model.js";
import { FriendRequest } from "../src/models/friendRequest.model.js";

dotenv.config();

const friendshipPairs = [
  // Core platform users cluster (deeply interconnected for rich mutual friends)
  ["divyk", "ak47"],
  ["divyk", "kozmic"],
  ["divyk", "kabhimanyu"],
  ["divyk", "koz"],
  ["kozmic", "ak47"],
  ["kozmic", "kabhimanyu"],
  ["kozmic", "koz"],
  ["ak47", "kabhimanyu"],
  ["ak47", "koz"],
  ["kabhimanyu", "koz"],

  // Bridges connecting platform users to movie characters
  ["divyk", "ironman"],
  ["divyk", "theone"],
  ["kozmic", "batman"],
  ["kozmic", "marty"],
  ["ak47", "007"],
  ["ak47", "babayaga"],
  ["kabhimanyu", "theone"],
  ["kabhimanyu", "luke"],
  ["koz", "ironman"],
  ["koz", "indy"],

  // Superhero / Action cluster
  ["ironman", "batman"],
  ["ironman", "007"],
  ["ironman", "theone"],
  ["ironman", "marty"],
  ["batman", "theone"],
  ["batman", "babayaga"],
  ["batman", "sarah"],
  ["theone", "babayaga"],
  ["007", "babayaga"],
  ["007", "indy"],

  // Sci-Fi / Adventure cluster
  ["luke", "indy"],
  ["luke", "marty"],
  ["luke", "theone"],
  ["indy", "ripley"],
  ["ripley", "sarah"],
  ["ripley", "babayaga"],
  ["sarah", "babayaga"],
  ["marty", "indy"]
];

async function populateAllFriends() {
  let driver;
  try {
    console.log("🔌 Connecting to MongoDB videotube...");
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("✅ MongoDB Connected");

    console.log("🔌 Connecting to Neo4j...");
    driver = neo4j.driver(
      process.env.NEO4J_URI || "bolt://localhost:7687",
      neo4j.auth.basic(
        process.env.NEO4J_USER || "neo4j",
        process.env.NEO4J_PASSWORD || "password"
      )
    );
    const session = driver.session();
    console.log("✅ Neo4j Connected");

    // Fetch all users from Mongo
    const allUsers = await User.find({}, "_id username fullName");
    const userMap = new Map();
    for (const u of allUsers) {
      userMap.set(u.username, u);
    }
    console.log(`Found ${allUsers.length} users in database.`);

    let mongoCreatedCount = 0;
    let neo4jEdgesCreated = 0;

    console.log("\n🤝 Populating Friendship network...");

    for (const [u1name, u2name] of friendshipPairs) {
      const u1 = userMap.get(u1name);
      const u2 = userMap.get(u2name);

      if (!u1 || !u2) {
        console.warn(`⚠️ User not found: ${u1name} or ${u2name}, skipping`);
        continue;
      }

      const sId = u1._id;
      const rId = u2._id;

      // 1. Ensure in MongoDB FriendRequest with ACCEPTED status
      const existing = await FriendRequest.findOne({
        $or: [
          { sender: sId, receiver: rId },
          { sender: rId, receiver: sId }
        ]
      });

      if (!existing) {
        await FriendRequest.create({
          sender: sId,
          receiver: rId,
          status: "ACCEPTED"
        });
        mongoCreatedCount++;
      } else if (existing.status !== "ACCEPTED") {
        existing.status = "ACCEPTED";
        await existing.save();
        mongoCreatedCount++;
      }

      // 2. Ensure in Neo4j with both FRIEND and FRIEND_WITH bidirectionally
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
          s: sId.toString(),
          r: rId.toString()
        }
      );
      neo4jEdgesCreated += 2;
    }

    console.log(`\n🎉 Finished populating friendships!`);
    console.log(`- New/Updated MongoDB friendships: ${mongoCreatedCount}`);
    console.log(`- Total pairs processed: ${friendshipPairs.length}`);

    // Verify Neo4j stats
    const totalFriends = await session.run("MATCH ()-[r:FRIEND]->() RETURN count(r) AS c");
    const totalFriendWith = await session.run("MATCH ()-[r:FRIEND_WITH]->() RETURN count(r) AS c");
    console.log(`- Neo4j total FRIEND edges: ${totalFriends.records[0].get("c")}`);
    console.log(`- Neo4j total FRIEND_WITH edges: ${totalFriendWith.records[0].get("c")}`);

    // Verify Divyk's friends
    const divyk = userMap.get("divyk");
    if (divyk) {
      const divykFriends = await session.run(
        `
        MATCH (u:User {mongoId: $id})-[:FRIEND]->(f:User)
        RETURN f.username as friend
        `,
        { id: divyk._id.toString() }
      );
      console.log(`- divyk friends (${divykFriends.records.length}):`, divykFriends.records.map(r => r.get("friend")));

      // Check divyk mutuals with batman
      const batman = userMap.get("batman");
      if (batman) {
        const mutuals = await session.run(
          `
          MATCH (u1:User {mongoId: $u1})-[:FRIEND]-(mf:User)-[:FRIEND]-(u2:User {mongoId: $u2})
          RETURN DISTINCT mf.username as mutual
          `,
          { u1: divyk._id.toString(), u2: batman._id.toString() }
        );
        console.log(`- divyk & batman mutual friends (${mutuals.records.length}):`, mutuals.records.map(r => r.get("mutual")));
      }
    }

    await session.close();
    await driver.close();
    await mongoose.disconnect();
    console.log("\nDone!");
    process.exit(0);
  } catch (err) {
    console.error("Error populating friends:", err);
    if (driver) await driver.close();
    process.exit(1);
  }
}

populateAllFriends();
