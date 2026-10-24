import mongoose from "mongoose";
import dotenv from "dotenv";

// Load env before anything else
dotenv.config();

import { User } from "./src/models/user.model.js";
import { Community } from "./src/models/community.model.js";
import { CommunityMembership } from "./src/models/communityMembership.model.js";
import { FriendRequest } from "./src/models/friendRequest.model.js";
import { Thread } from "./src/models/thread.model.js";
import { Tweet } from "./src/models/tweet.model.js";
import { createUserNode } from "./src/services/graph/userGraph.service.js";
import { createCommunityNode } from "./src/services/graph/communityGraph.service.js";
import { addFriend, joinCommunity } from "./src/services/graph/relationshipGraph.service.js";
import { DB_NAME } from "./src/constants.js";

const movieCharacters = [
  { fullName: "Tony Stark", username: "ironman", email: "tony@stark.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=Tony+Stark&background=ef4444&color=fff" },
  { fullName: "Bruce Wayne", username: "batman", email: "bruce@wayne.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=Bruce+Wayne&background=1f2937&color=fff" },
  { fullName: "Luke Skywalker", username: "luke", email: "luke@jedi.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=Luke+Skywalker&background=3b82f6&color=fff" },
  { fullName: "Indiana Jones", username: "indy", email: "indy@archaeology.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=Indiana+Jones&background=d97706&color=fff" },
  { fullName: "Ellen Ripley", username: "ripley", email: "ellen@weyland.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=Ellen+Ripley&background=10b981&color=fff" },
  { fullName: "James Bond", username: "007", email: "james@mi6.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=James+Bond&background=000000&color=fff" },
  { fullName: "Neo", username: "theone", email: "neo@matrix.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=Neo&background=22c55e&color=fff" },
  { fullName: "Sarah Connor", username: "sarah", email: "sarah@resistance.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=Sarah+Connor&background=6b7280&color=fff" },
  { fullName: "John Wick", username: "babayaga", email: "john@continental.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=John+Wick&background=000000&color=fff" },
  { fullName: "Marty McFly", username: "marty", email: "marty@delorean.com", password: "password123", avatar: "https://ui-avatars.com/api/?name=Marty+McFly&background=f43f5e&color=fff" }
];

const communities = [
  { name: "Sci-Fi Nerds", slug: "scifi", description: "All things science fiction." },
  { name: "Action Heroes", slug: "action", description: "Explosions and cool guys." },
  { name: "Time Travel", slug: "timetravel", description: "Great Scott!" }
];

const runSeed = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Connected to DB.");

        console.log("Creating users...");
        const users = [];
        for (const char of movieCharacters) {
            let u = await User.findOne({ username: char.username });
            if (!u) {
                u = await User.create({
                    ...char,
                    coverImage: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=2000&auto=format&fit=crop"
                });
                try {
                    await createUserNode(u._id, u.username);
                } catch (e) {
                    console.log(`[Neo4j Skip] Could not create user node for ${u.username}`);
                }
                console.log(`Created user ${u.username}`);
            }
            users.push(u);
        }

        console.log("Creating communities...");
        const comms = [];
        for (let i=0; i<communities.length; i++) {
            const commData = communities[i];
            let c = await Community.findOne({ slug: commData.slug });
            if (!c) {
                // First user creates first community, second creates second, etc.
                const creator = users[i % users.length];
                const cArray = await Community.create([{
                    ...commData,
                    creator: creator._id,
                    memberCount: 1
                }]);
                c = cArray[0];
                
                await CommunityMembership.create({
                    userId: creator._id,
                    communityId: c._id,
                    role: "OWNER",
                    status: "APPROVED"
                });
                
                try {
                    await createCommunityNode(c._id);
                    await joinCommunity(creator._id, c._id);
                } catch (e) {
                    console.log(`[Neo4j Skip] Could not sync community ${c.name}`);
                }
                console.log(`Created community ${c.name}`);
            }
            comms.push(c);
        }

        console.log("Establishing friend connections for recommendations...");
        // Network:
        // Iron Man - Batman
        // Iron Man - James Bond
        // Batman - Neo
        // Batman - John Wick
        // Neo - John Wick
        // We want Iron Man to get recommendations for Neo and John Wick.
        
        const getUser = (username) => users.find(u => u.username === username);
        
        const edges = [
            ["ironman", "batman"],
            ["ironman", "007"],
            ["batman", "theone"],
            ["batman", "babayaga"],
            ["theone", "babayaga"],
            ["luke", "indy"],
            ["luke", "marty"],
            ["indy", "ripley"],
            ["ripley", "sarah"],
        ];

        for (const [u1name, u2name] of edges) {
            const u1 = getUser(u1name);
            const u2 = getUser(u2name);
            if (u1 && u2) {
                // Ensure MongoDB relationship exists
                const existingReq = await FriendRequest.findOne({
                    $or: [
                        { sender: u1._id, receiver: u2._id },
                        { sender: u2._id, receiver: u1._id }
                    ]
                });
                
                if (!existingReq) {
                    await FriendRequest.create({
                        sender: u1._id,
                        receiver: u2._id,
                        status: "ACCEPTED"
                    });
                }
                
                try {
                    await addFriend(u1._id, u2._id);
                    console.log(`Added friend edge: ${u1name} <-> ${u2name}`);
                } catch (e) {
                    console.log(`[Neo4j Skip] Could not add friend edge ${u1name} <-> ${u2name}`);
                }
            }
        }

        console.log("Creating some posts...");
        // Create some threads in communities
        if (comms.length > 0) {
            await Thread.create({
                communityId: comms[0]._id,
                authorId: getUser("ironman")._id,
                title: "Best suit materials?",
                body: "I'm thinking nanotech is the future.",
            });
            await Thread.create({
                communityId: comms[1]._id,
                authorId: getUser("batman")._id,
                title: "Grappling hooks vs jetpacks",
                body: "Thoughts?",
            });
        }
        
        // Create some tweets
        await Tweet.create({
            owner: getUser("marty")._id,
            content: "Where we're going, we don't need roads."
        });
        await Tweet.create({
            owner: getUser("007")._id,
            content: "Shaken, not stirred."
        });
        
        console.log("Seeding complete!");
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

runSeed();
