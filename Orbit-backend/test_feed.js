import mongoose from 'mongoose';
import { getUnifiedFeed } from './src/services/graph/feed.service.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const result = await getUnifiedFeed("111111111111111111111111"); // dummy id
        console.log("SUCCESS:", result);
    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit();
});
