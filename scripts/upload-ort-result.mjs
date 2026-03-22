import fs from "node:fs";
import path from "node:path";
import {OrtCompressor} from 'ortcompressor';

function fail(message, extra = "") {
  console.error(message);
  if (extra) console.error(extra);
  process.exit(1);
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Failed to read JSON file: ${filePath}`, String(error));
  }
}

function resolveHorusecConfig(projectRoot) {
  const candidates = [
    path.join(projectRoot, "horusec-config.json"),
    path.join(projectRoot, ".horusec", "config.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function resolveProjectName(projectRoot, configPath) {
  const fallback = path.basename(projectRoot);

  if (!configPath) return fallback;

  const config = readJsonFile(configPath);
  const projectName = config.horusecCliRepositoryName ?? fallback;

  return String(projectName).trim() || fallback;
}

function renderPrComment(projectName, violations) {
  const hasViolations = violations.length > 0;

  let body = `<!-- license-report-comment -->\n`;
  body += `## License compliance report\n\n`;
  body += `**Project:** ${projectName}  \n`;
  body += `**Violations:** ${violations.length}\n\n`;

  if (!hasViolations) {
    body += "No unapproved licenses found.\n";
  } else {
    body += "The following dependencies use licenses that are not approved:\n\n";
    body += "| Dependency | Version | License | Npm Link |\n";
    body += "|---|---:|---|---|\n";

    for (const item of violations) {
      body += `| ${item.name} | ${item.installedVersion} | ${item.licenseType} | (NPM)[${item.link}] |\n`;
    }
  }

  return body;
}

async function main() {
  const apiUri = process.env.API_URI;
  const apiToken = process.env.API_TOKEN;
  const analyzerResultPath = process.env.ORT_ANALYZER_RESULT_PATH;
  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const githubOutput = process.env.GITHUB_OUTPUT;
  const runnerTemp = process.env.RUNNER_TEMP || ".";

  if (!apiUri) fail("Missing API_URI");
  if (!apiToken) fail("Missing API_TOKEN");

  if (!analyzerResultPath) {
    fail("Missing ORT_ANALYZER_RESULT_PATH");
  }

  if (!fs.existsSync(analyzerResultPath)) {
    fail(`ORT analyzer result file not found: ${analyzerResultPath}`);
  }

  // ── Resolve project name from Horusec config ───────────────
  const horusecConfigPath = resolveHorusecConfig(projectRoot);
  const projectName = resolveProjectName(projectRoot, horusecConfigPath);

  console.log(`Resolved project name: ${projectName}`);
  if (horusecConfigPath) {
    console.log(`Using Horusec config: ${horusecConfigPath}`);
  } else {
    console.log("No Horusec config found, falling back to repo directory name");
  }

  // ── Compress analyzer result ────────────────────────────────
  const input = JSON.parse(fs.readFileSync(analyzerResultPath, 'utf-8'));
  const gzipped = OrtCompressor.compress(input);
  const body = new FormData();

  body.append('repositoryName', projectName);
  body.append('dependencies', new Blob([gzipped]), 'compressed.ortpack');

  // ── Upload to API ───────────────────────────────────────────
  const response = await fetch(apiUri, {
    method: "POST",
    headers: {
      "x-horusec-authorization": apiToken,
    },
    body
  });

  if (!response.ok && response.status !== 417) {
    fail(
      `Upload failed: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  console.log("Upload succeeded");

  let violations = [];

  if (response.status === 417) {
    try {
        violations = await response.json();
    } catch {
        console.log("API response is not JSON or has no violations array — skipping PR comment");
    }
  }

  const hasViolations = violations.length > 0;

  // ── Generate PR comment markdown ────────────────────────────
  const commentBody = renderPrComment(projectName, violations);
  const commentFile = path.join(runnerTemp, "license-report.md");
  fs.writeFileSync(commentFile, commentBody);

  // ── Write step outputs ──────────────────────────────────────
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `project_name=${projectName}\n`);
    fs.appendFileSync(githubOutput, `has_violations=${hasViolations}\n`);
    fs.appendFileSync(githubOutput, `violation_count=${violations.length}\n`);
    fs.appendFileSync(githubOutput, `comment_path=${commentFile}\n`);
  }

  if (hasViolations) {
    fail(`Found ${violations.length} license violations`);
  }
}

await main();
