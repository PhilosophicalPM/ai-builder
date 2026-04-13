import fs from "fs";
import path from "path";

const VC_ROOT = path.resolve(import.meta.dirname, "../../");

function readDirRecursive(dir) {
  let results = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith(".")) {
        results = results.concat(readDirRecursive(fullPath));
      } else if (item.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // skip unreadable dirs
  }
  return results;
}

function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\n*/m, "").trim();
}

function stripImageRefs(content) {
  return content
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/!\[.*?\]/g, "")
    .replace(/\[image\d+\]/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

// 1. Process Brained notes
console.log("Processing Brained notes...");
const brainedFiles = readDirRecursive(path.join(VC_ROOT, "Brained"));
const brainedSections = [];
for (const f of brainedFiles) {
  const raw = fs.readFileSync(f, "utf8");
  const content = stripFrontmatter(raw);
  if (content.length < 30) continue;
  const relativePath = f.replace(path.join(VC_ROOT, "Brained") + "/", "");
  brainedSections.push(`### ${relativePath}\n${content}`);
}
console.log(`  ${brainedSections.length} notes processed`);

// 2. Process Substack articles (use summaries instead of full articles)
console.log("Processing Substack articles...");
const substackSummaryPath = path.join(VC_ROOT, "Substack", "summaries.md");
let substackContent = "";
if (fs.existsSync(substackSummaryPath)) {
  substackContent = fs.readFileSync(substackSummaryPath, "utf8");
  console.log("  Using summarised Substack articles");
} else {
  const substackDir = path.join(VC_ROOT, "Substack");
  const substackFiles = fs.readdirSync(substackDir).filter((f) => f.endsWith(".md"));
  const substackSections = [];
  for (const f of substackFiles) {
    let content = fs.readFileSync(path.join(substackDir, f), "utf8");
    content = stripImageRefs(content);
    substackSections.push(
      `### Published Article: ${f.replace(".md", "")}\n${content.trim()}`
    );
  }
  substackContent = substackSections.join("\n\n---\n\n");
  console.log(`  ${substackSections.length} full articles processed`);
}

// 3. Process tweets
console.log("Processing tweets...");
let tweetSection = "";
try {
  const tweetsRaw = fs.readFileSync(
    path.join(VC_ROOT, "twitter/data/tweets.js"),
    "utf8"
  );
  const jsonStr = tweetsRaw.replace("window.YTD.tweets.part0 = ", "");
  const tweets = JSON.parse(jsonStr);
  const originalTweets = tweets
    .filter((t) => !t.tweet.full_text.startsWith("RT @"))
    .filter((t) => !t.tweet.in_reply_to_status_id)
    .map((t) => ({
      text: t.tweet.full_text.replace(/https:\/\/t\.co\/\S+/g, "").trim(),
      date: t.tweet.created_at,
      likes: parseInt(t.tweet.favorite_count) || 0,
    }))
    .filter((t) => t.text.length > 30)
    .sort((a, b) => b.likes - a.likes);

  tweetSection = originalTweets
    .map((t) => `- ${t.text}`)
    .join("\n");
  console.log(`  ${originalTweets.length} original tweets processed`);
} catch (e) {
  console.log(`  Error processing tweets: ${e.message}`);
}

// 4. Read Investment Thesis
console.log("Processing Investment Thesis...");
const thesis = fs.readFileSync(
  path.join(VC_ROOT, "Investment Thesis (1).md"),
  "utf8"
);

// 5. Read Theory of Curiosity
console.log("Processing Theory of Curiosity...");
const theory = fs.readFileSync(
  path.join(VC_ROOT, "Theory of Curisotiy.md"),
  "utf8"
);

// 6. Read Resume
console.log("Processing Resume...");
const resumeDir = path.join(VC_ROOT, "Resumes");
const resumeMdFiles = fs
  .readdirSync(resumeDir)
  .filter((f) => f.endsWith(".md"));
let resume = "";
for (const f of resumeMdFiles) {
  resume += fs.readFileSync(path.join(resumeDir, f), "utf8") + "\n";
}

// Assemble knowledge base
const knowledgeBase = `
# HUZEFA'S KNOWLEDGE BASE

This is the complete knowledge base of Huzefa H — his thinking, frameworks, published writing, career history, and perspectives. Use this to answer questions as Huzefa would.

---

## SECTION 1: INVESTMENT THESIS

${thesis}

---

## SECTION 2: THEORY OF CURIOSITY

${theory}

---

## SECTION 3: CAREER & RESUME

${resume}

---

## SECTION 4: PUBLISHED ARTICLES (Substack — thinkersnook.substack.com)

${substackContent}

Links to full articles:
- JioHotstar: https://thinkersnook.substack.com/p/whats-next-for-jiohotstar
- Creator Economy Part 1: https://thinkersnook.substack.com/p/creator-economy-in-india-part-1
- Creator Economy Part 2 (Dream11): https://thinkersnook.substack.com/p/creator-economy-and-dream11-part
- Cult Fitness Retention: https://thinkersnook.substack.com/p/how-to-drive-retention-for-fitness
- Theory of Curiosity: https://open.substack.com/pub/thinkersnook/p/dont-try-to-be-happy-just-have-fun

---

## SECTION 5: THINKING & PHILOSOPHY (Personal Notes)

${brainedSections.join("\n\n---\n\n")}

---

## SECTION 6: TWEETS (Original thoughts from Twitter/X)

${tweetSection}
`.trim();

// Write output
const outputPath = path.join(VC_ROOT, "app-ai-builder/src/lib/knowledge-base.txt");
fs.writeFileSync(outputPath, knowledgeBase);

const charCount = knowledgeBase.length;
const approxTokens = Math.round(charCount / 4);
console.log(`\nKnowledge base written to ${outputPath}`);
console.log(`  Characters: ${charCount.toLocaleString()}`);
console.log(`  Approx tokens: ${approxTokens.toLocaleString()}`);
