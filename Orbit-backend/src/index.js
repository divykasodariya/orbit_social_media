// ============================================
// index.js - FOR RENDER & LOCAL DEVELOPMENT
// ============================================

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { initNeo4j } from "./config/neo4j.config.js";
import { setupConstraints } from "./services/graph/neo4j.service.js";

// Load environment variables
dotenv.config({ path: "./.env" });

// Connect to MongoDB
connectDB()
  .then(() => {
    // Start server
    const PORT = process.env.PORT || 8000;
    
    app.listen(PORT, async () => {
      console.log(`✅ Server is running at Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      
      try {
          const neo4jDriver = initNeo4j();
          if (neo4jDriver) {
              await setupConstraints();
          }
      } catch (err) {
          console.error("Neo4j Initialization Failed", err);
      }
    });

    // Handle server errors
    app.on("error", (error) => {
      console.error("❌ Server Error:", error);
      throw error;
    });
  })
  .catch((error) => {
    console.error("❌ MONGODB connection failed:", error);
    process.exit(1);
  });


// ============================================
// ALTERNATIVE: If using Vercel (Serverless)
// Uncomment this and comment out the above
// ============================================

// import dotenv from "dotenv";
// import connectDB from "./db/index.js";
// import { app } from "./app.js";

// dotenv.config({ path: "./.env" });

// // Connect DB once
// await connectDB();

// // Export for Vercel
// export default app;


























// import dotenv from "dotenv";
// import connectDB from "./db/index.js";
// import { app } from "./app.js";

// dotenv.config({ path: "./.env" });

// // ⛔ DO NOT listen on a port
// // ✅ Just connect DB once
// await connectDB();

// // ✅ Export app for Vercel
// export default app;






// // require('dotenv').config({path: './env'})

// import dotenv from 'dotenv'
// import mongoose from 'mongoose'
// import {DB_NAME} from "./constants.js"
// import { app } from './app.js'

// import connectDB from './db/index.js'

// dotenv.config({
//     path: './.env'
// })

// connectDB()
// .then(() =>{
//     app.listen(process.env.PORT || 8000, ()=>{
//         console.log(`Server is running at Port : ${process.env.PORT}`);
//     })
// })
// .catch((error)=>{
//     console.log("MONGO DB connection failed !!! ", error);
// })







/*
import express from 'express'
const app = express()

(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (errpr)=>{
            console.log("ERROR ",error)
            throw error
        })
        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on PORT ${process.env.PORT}`)
        })
    }
    catch(error){
        console.error("ERROR ",error);
        throw error
    }
})()
    */