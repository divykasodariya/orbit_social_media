import mongoose from 'mongoose';
import { Tweet } from './src/models/tweet.model.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const lastTweet = await Tweet.findOne().sort({ createdAt: -1 });
        console.log("LAST TWEET:", lastTweet);
    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit();
});
