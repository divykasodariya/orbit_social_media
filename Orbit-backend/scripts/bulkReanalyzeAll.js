/**
 * Orbit AI Bulk Re-Analysis Script
 * ─────────────────────────────────────────────────────────────
 * Re-runs BOTH moderation AND AI analysis on all videos in the DB.
 *
 * Usage:
 *   node scripts/bulkReanalyzeAll.js
 *
 * Options (env vars):
 *   BATCH_SIZE=3         - how many videos to process in parallel (default: 2)
 *   DELAY_MS=4000        - ms delay between batches to respect Groq TPM (default: 4000)
 *   SKIP_MODERATION=1    - skip moderation pass
 *   SKIP_ANALYSIS=1      - skip AI analysis pass
 *   FORCE=1              - re-process even if already completed
 */

import "dotenv/config";
import mongoose from "mongoose";
import { DB_NAME } from "../src/constants.js";
import { Video } from "../src/models/video.model.js";
import { moderateVideoById } from "../src/services/moderation/videoModeration.service.js";
import { analyzeVideoById } from "../src/services/ai/videoAnalysis.service.js";

// ─── Config ──────────────────────────────────────────────────
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "2", 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || "4000", 10);
const SKIP_MODERATION = process.env.SKIP_MODERATION === "1";
const SKIP_ANALYSIS = process.env.SKIP_ANALYSIS === "1";
const FORCE = process.env.FORCE === "1";

// ─── Helpers ─────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fmt = (n) => String(n).padStart(4, " ");

/**
 * Process a single video: moderation + analysis
 */
async function processVideo(video, idx, total) {
  const label = `[${fmt(idx)}/${fmt(total)}] "${video.title?.slice(0, 50)}" (${video._id})`;
  const results = { moderation: null, analysis: null, errors: [] };

  // ── Moderation ───────────────────────────────────────────
  if (!SKIP_MODERATION) {
    const alreadyDone =
      video.moderationStatus === "completed" && !FORCE;

    if (alreadyDone) {
      console.log(`  ${label} | moderation: SKIP (already completed, use FORCE=1 to redo)`);
      results.moderation = "skipped";
    } else {
      try {
        const mod = await moderateVideoById(video._id);
        console.log(
          `  ${label} | moderation: OK  | toxicity=${mod.toxicityScore} shadowBan=${mod.shouldShadowBan} cats=[${mod.flaggedCategories.join(",")}]`
        );
        results.moderation = "ok";
      } catch (err) {
        console.error(`  ${label} | moderation: FAIL | ${err.message}`);
        results.errors.push(`moderation: ${err.message}`);
        results.moderation = "failed";
      }
    }
  }

  // ── AI Analysis ──────────────────────────────────────────
  if (!SKIP_ANALYSIS) {
    const alreadyDone =
      video.aiAnalysis?.analysisStatus === "completed" && !FORCE;

    if (alreadyDone) {
      console.log(`  ${label} | analysis:   SKIP (already completed, use FORCE=1 to redo)`);
      results.analysis = "skipped";
    } else {
      // Only run analysis if transcript exists (otherwise LLM has nothing to work with)
      const hasContent = video.transcript || (video.segments && video.segments.length > 0);
      if (!hasContent) {
        console.log(`  ${label} | analysis:   SKIP (no transcript yet)`);
        results.analysis = "no_transcript";
      } else {
        try {
          const ai = await analyzeVideoById(video._id);
          console.log(
            `  ${label} | analysis:   OK  | chapters=${ai.chapters?.length} advisory=${ai.advisory?.hasAdvisory ? ai.advisory.category : "none"}`
          );
          results.analysis = "ok";
        } catch (err) {
          console.error(`  ${label} | analysis:   FAIL | ${err.message}`);
          results.errors.push(`analysis: ${err.message}`);
          results.analysis = "failed";
        }
      }
    }
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("─".repeat(72));
  console.log("  Orbit AI Bulk Re-Analysis Script");
  console.log(`  BATCH_SIZE=${BATCH_SIZE}  DELAY_MS=${DELAY_MS}  FORCE=${FORCE}`);
  console.log(
    `  SKIP_MODERATION=${SKIP_MODERATION}  SKIP_ANALYSIS=${SKIP_ANALYSIS}`
  );
  console.log("─".repeat(72));

  // Connect to MongoDB
  console.log("Connecting to MongoDB...");
  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
  console.log("Connected.\n");

  // Fetch all non-deleted videos
  const videos = await Video.find({ isDeleted: { $ne: true } })
    .select("_id title moderationStatus aiAnalysis transcript segments")
    .lean();

  const total = videos.length;
  console.log(`Found ${total} video(s) to process.\n`);

  if (total === 0) {
    console.log("Nothing to do. Exiting.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // Track stats
  const stats = {
    total,
    modOk: 0, modSkipped: 0, modFailed: 0,
    aiOk: 0, aiSkipped: 0, aiFailed: 0,
    noTranscript: 0,
  };

  // Process in batches
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map((v, j) => processVideo(v, i + j + 1, total))
    );

    for (const r of batchResults) {
      if (r.moderation === "ok") stats.modOk++;
      else if (r.moderation === "skipped") stats.modSkipped++;
      else if (r.moderation === "failed") stats.modFailed++;

      if (r.analysis === "ok") stats.aiOk++;
      else if (r.analysis === "skipped") stats.aiSkipped++;
      else if (r.analysis === "failed") stats.aiFailed++;
      else if (r.analysis === "no_transcript") stats.noTranscript++;
    }

    // Delay between batches to avoid hammering Groq rate limits
    if (i + BATCH_SIZE < total) {
      console.log(`\n  ⏳ Waiting ${DELAY_MS}ms before next batch...\n`);
      await sleep(DELAY_MS);
    }
  }

  // ── Summary ───────────────────────────────────────────────
  console.log("\n" + "─".repeat(72));
  console.log("  DONE — Summary");
  console.log("─".repeat(72));
  console.log(`  Total videos processed : ${stats.total}`);
  console.log(`  Moderation`);
  console.log(`    ✓ OK       : ${stats.modOk}`);
  console.log(`    ⏭ Skipped  : ${stats.modSkipped}`);
  console.log(`    ✗ Failed   : ${stats.modFailed}`);
  console.log(`  AI Analysis`);
  console.log(`    ✓ OK       : ${stats.aiOk}`);
  console.log(`    ⏭ Skipped  : ${stats.aiSkipped}`);
  console.log(`    ⚠ No transcript : ${stats.noTranscript}`);
  console.log(`    ✗ Failed   : ${stats.aiFailed}`);
  console.log("─".repeat(72));

  await mongoose.disconnect();
  process.exit(stats.modFailed + stats.aiFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
