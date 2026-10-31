
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

let connectionPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`,
            {
                serverSelectionTimeoutMS: 10000
            }
        )
        .then((connection) => {
            console.log(
                `MongoDB connected !! DB HOST: ${connection.connection.host}`
            );
            return connection.connection;
        })
        .catch((error) => {
            connectionPromise = null;
            console.error("MongoDB connection failed:", error);
            throw error;
        });
    }

    return connectionPromise;
};

export default connectDB;
