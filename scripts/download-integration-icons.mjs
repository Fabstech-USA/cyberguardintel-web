/**
 * Downloads official brand icons into public/integrations/icons/.
 * Run: node scripts/download-integration-icons.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/integrations/icons");

/** catalog id -> remote source URL (Iconify, Wikimedia, or brand CDN) */
const SOURCES = {
  aws: "https://api.iconify.design/logos:aws.svg",
  gcp: "https://api.iconify.design/logos:google-cloud.svg",
  azure: "https://api.iconify.design/logos:microsoft-azure.svg",
  digitalocean: "https://api.iconify.design/logos:digital-ocean.svg",
  cloudflare: "https://api.iconify.design/logos:cloudflare.svg",
  okta: "https://api.iconify.design/logos:okta-icon.svg",
  auth0: "https://api.iconify.design/logos:auth0-icon.svg",
  jumpcloud:
    "https://jumpcloud.com/wp-content/uploads/2023/01/jumpcloud-logo-2023.png",
  onelogin:
    "https://upload.wikimedia.org/wikipedia/commons/c/c5/OneLogin_logo.svg",
  duo: "https://api.iconify.design/arcticons:duomobile.svg",
  "google-workspace":
    "https://api.iconify.design/logos:google-workspace.svg",
  "microsoft-365": "https://api.iconify.design/logos:microsoft-icon.svg",
  notion: "https://api.iconify.design/logos:notion-icon.svg",
  confluence: "https://api.iconify.design/logos:confluence.svg",
  asana: "https://api.iconify.design/logos:asana.svg",
  slack: "https://api.iconify.design/logos:slack-icon.svg",
  zoom: "https://api.iconify.design/logos:zoom-icon.svg",
  teams: "https://api.iconify.design/logos:microsoft-teams.svg",
  twilio: "https://api.iconify.design/logos:twilio-icon.svg",
  intercom: "https://api.iconify.design/logos:intercom-icon.svg",
  dropbox: "https://api.iconify.design/logos:dropbox.svg",
  box: "https://api.iconify.design/logos:box.svg",
  onedrive: "https://api.iconify.design/logos:microsoft-onedrive.svg",
  egnyte: "https://api.iconify.design/simple-icons:egnyte.svg",
  backblaze: "https://api.iconify.design/simple-icons:backblaze.svg",
  github: "https://api.iconify.design/logos:github-icon.svg",
  gitlab: "https://api.iconify.design/logos:gitlab.svg",
  bitbucket: "https://api.iconify.design/logos:bitbucket.svg",
  jira: "https://api.iconify.design/logos:jira.svg",
  linear: "https://api.iconify.design/logos:linear-icon.svg",
  datadog: "https://api.iconify.design/logos:datadog.svg",
  sentry: "https://api.iconify.design/logos:sentry-icon.svg",
  crowdstrike:
    "https://upload.wikimedia.org/wikipedia/commons/4/4f/CrowdStrike_logo.svg",
  snyk: "https://api.iconify.design/simple-icons:snyk.svg",
  tenable:
    "https://upload.wikimedia.org/wikipedia/commons/6/66/Tenable%2C_Inc._logo.svg",
  pagerduty: "https://api.iconify.design/logos:pagerduty.svg",
  "1password": "https://api.iconify.design/simple-icons:1password.svg",
  bitwarden: "https://api.iconify.design/simple-icons:bitwarden.svg",
  lastpass: "https://api.iconify.design/simple-icons:lastpass.svg",
  bamboohr: "https://api.iconify.design/arcticons:bamboohr.svg",
  rippling: "https://rippling2.imgix.net/wordmark-1320.svg",
  gusto: "https://api.iconify.design/logos:gusto.svg",
  workday: "https://api.iconify.design/arcticons:workday.svg",
  deel: "https://website-media.deel.com/General_Purple_f6b2f3f9bd.png",
  epic: "https://upload.wikimedia.org/wikipedia/commons/2/24/Epic_Systems.svg",
  athena:
    "https://caas.athenahealth.com/sites/default/files/styles/webp_image_style/public/athenahealth_Logo_Thumbnail.webp?itok=DtKR7vq6",
  cerner: "https://api.iconify.design/logos:oracle.svg",
  drchrono: "https://www.drchrono.com/apple-touch-icon.png",
  quickbooks: "https://api.iconify.design/simple-icons:quickbooks.svg",
  doxy: "https://framerusercontent.com/assets/MU291SUIPq1s82zgml4MsL3OKc.jpg",
};

function extFromUrl(url) {
  const clean = url.split("?")[0];
  const ext = path.extname(clean).slice(1).toLowerCase();
  return ext || "svg";
}

async function download(id, url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "CyberGuardIntel/1.0 (integration icon sync)" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const ext = extFromUrl(url);
  const bytes = Buffer.from(await response.arrayBuffer());
  const outPath = path.join(OUT_DIR, `${id}.${ext}`);
  await writeFile(outPath, bytes);
  return ext;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = {};
  let ok = 0;
  let failed = 0;

  for (const [id, url] of Object.entries(SOURCES)) {
    try {
      const ext = await download(id, url);
      manifest[id] = `/integrations/icons/${id}.${ext}`;
      console.log(`✓ ${id}.${ext}`);
      ok += 1;
    } catch (error) {
      console.error(`✗ ${id}: ${error.message}`);
      failed += 1;
    }
  }

  await writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nDone: ${ok} downloaded, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main();
