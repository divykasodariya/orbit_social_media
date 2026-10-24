import { useState } from "react";
import {
  createTweet,
  getUserTweets,
  deleteTweet
} from "../api/tweet.api";

export const useTweets = () => {
  const [tweets, setTweets] = useState([]);

  const fetchUserTweets = async (userId) => {
    const res = await getUserTweets(userId);
    setTweets(res.data.data);
  };

  const postTweet = async (data) => {
    const res = await createTweet(data);
    setTweets(prev => [res.data.data, ...prev]);
  };

  const removeTweet = async (id) => {
    await deleteTweet(id);
    setTweets(prev => prev.filter(t => t._id !== id));
  };

  return {
    tweets,
    fetchUserTweets,
    postTweet,
    removeTweet
  };
};
