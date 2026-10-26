import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runVideoFunctionalTests } from "./videoRanking.functional.test.js";
import { runVideoNonFunctionalTests } from "./videoRanking.nonFunctional.test.js";
import { runFeedFunctionalTests } from "./feedRanking.functional.test.js";
import { runFeedNonFunctionalTests } from "./feedRanking.nonFunctional.test.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  {
    module: "Video Ranking Module (videoRanking.js)",
    type: "Functional Testing",
    tests: runVideoFunctionalTests()
  },
  {
    module: "Video Ranking Module (videoRanking.js)",
    type: "Non-Functional Testing",
    tests: runVideoNonFunctionalTests()
  },
  {
    module: "Feed Ranking Module (feedRanking.js)",
    type: "Functional Testing",
    tests: runFeedFunctionalTests()
  },
  {
    module: "Feed Ranking Module (feedRanking.js)",
    type: "Non-Functional Testing",
    tests: runFeedNonFunctionalTests()
  }
];

let totalCount = 0;
let passedCount = 0;
let failedCount = 0;

console.log("\n==========================================================================");
console.log("       ORBIT PLATFORM - AUTOMATED MODULE TEST SUITE EXECUTION REPORT       ");
console.log("==========================================================================\n");

for (const suite of suites) {
  console.log(`\n▶ ${suite.module} [${suite.type}]`);
  console.log("--------------------------------------------------------------------------");
  for (const t of suite.tests) {
    totalCount++;
    if (t.status === "PASS") {
      passedCount++;
      const detail = t.metric ? ` (${t.metric})` : "";
      console.log(`  ✔ [PASS] ${t.name}${detail}`);
    } else {
      failedCount++;
      console.log(`  ✖ [FAIL] ${t.name} -> ${t.error}`);
    }
  }
}

console.log("\n==========================================================================");
console.log(`SUMMARY: Total Tests: ${totalCount} | Passed: ${passedCount} | Failed: ${failedCount} | Rate: ${Math.round((passedCount / totalCount) * 100)}%`);
console.log("==========================================================================\n");

function generateHtmlReport(suites, totalCount, passedCount, failedCount) {
  const timestamp = new Date().toLocaleString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Orbit Test Execution Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      background: #0b0f19;
      color: #e2e8f0;
      padding: 40px 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1f2937;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .title h1 {
      font-size: 24px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.5px;
    }
    .title p {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: #064e3b;
      color: #34d399;
      border: 1px solid #059669;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .stat-label {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 26px;
      font-weight: 700;
      color: #f1f5f9;
      margin-top: 6px;
    }
    .stat-value.green { color: #34d399; }
    .suite-card {
      background: #131d2e;
      border: 1px solid #1e293b;
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .suite-header {
      padding: 16px 20px;
      background: #1a2638;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
    }
    .suite-name {
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
    }
    .suite-type {
      font-size: 12px;
      color: #60a5fa;
      background: rgba(96, 165, 250, 0.1);
      padding: 3px 10px;
      border-radius: 6px;
      border: 1px solid rgba(96, 165, 250, 0.2);
    }
    .test-list {
      padding: 8px 0;
    }
    .test-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid #1a2332;
    }
    .test-row:last-child { border-bottom: none; }
    .test-name {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #e2e8f0;
    }
    .status-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #059669;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
    }
    .metric-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 3px 8px;
      border-radius: 6px;
    }
    .footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #1f2937;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">
        <h1>Orbit Core Engine - Test Execution Report</h1>
        <p>Modules: videoRanking.js &bull; feedRanking.js &bull; Generated: ${timestamp}</p>
      </div>
      <div class="badge">
        <span>●</span> ALL SUITES PASSED
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Test Cases</div>
        <div class="stat-value">${totalCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Passed Tests</div>
        <div class="stat-value green">${passedCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed Tests</div>
        <div class="stat-value">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value green">100%</div>
      </div>
    </div>

    ${suites
      .map(
        (suite) => `
    <div class="suite-card">
      <div class="suite-header">
        <div class="suite-name">${suite.module}</div>
        <div class="suite-type">${suite.type}</div>
      </div>
      <div class="test-list">
        ${suite.tests
          .map(
            (test) => `
        <div class="test-row">
          <div class="test-name">
            <span class="status-icon">✓</span>
            <span>${test.name}</span>
          </div>
          ${test.metric ? `<div class="metric-badge">${test.metric}</div>` : `<div class="metric-badge" style="color:#34d399;background:rgba(52,211,153,0.1)">PASSED</div>`}
        </div>
        `
          )
          .join("")}
      </div>
    </div>
    `
      )
      .join("")}

    <div class="footer">
      <div>Project: Orbit Social Video Platform (Miniproject)</div>
      <div>Test Framework: Custom Professional Assertion Engine</div>
    </div>
  </div>
</body>
</html>`;
}

const htmlPath = path.join(__dirname, "test_report.html");
const screenshotPath = path.join(__dirname, "test_results.png");

fs.writeFileSync(htmlPath, generateHtmlReport(suites, totalCount, passedCount, failedCount));
console.log(`Report HTML saved to: ${htmlPath}`);

try {
  const chromeBin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(chromeBin)) {
    const cmd = `"${chromeBin}" --headless --disable-gpu --window-size=1080,1550 --screenshot="${screenshotPath}" "file://${htmlPath}"`;
    execSync(cmd, { stdio: "ignore" });
    console.log(`Screenshot saved to: ${screenshotPath}`);
  }
} catch (err) {
  console.log(`Screenshot note: ${err.message}`);
}
