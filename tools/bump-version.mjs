import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("src", "buildInfo.js");
const indexFile = resolve("index.html");

function tokyoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}`;
}

function previousBuildInfo(source) {
  const version = source.match(/BUILD_VERSION\s*=\s*"(\d{8})\.(\d+)"/);
  const date = source.match(/BUILD_DATE\s*=\s*"(\d{8})"/);
  const count = source.match(/BUILD_COUNT\s*=\s*(\d+)/);
  return {
    date: date?.[1] || version?.[1] || "",
    count: Number(count?.[1] || version?.[2] || 0),
  };
}

const today = tokyoDate();
let previous = { date: "", count: 0 };
try {
  previous = previousBuildInfo(readFileSync(file, "utf8"));
} catch {
  // First buildInfo generation.
}

const nextCount = previous.date === today ? previous.count + 1 : 1;
const version = `${today}.${nextCount}`;
const source = `export const BUILD_VERSION = "${version}";\nexport const BUILD_DATE = "${today}";\nexport const BUILD_COUNT = ${nextCount};\n`;

writeFileSync(file, source, "utf8");
try {
  const index = readFileSync(indexFile, "utf8").replace(
    /(<div id="versionBadge" class="version-badge" aria-label="Build version">)v[^<]+(<\/div>)/,
    `$1v${version}$2`
  );
  writeFileSync(indexFile, index, "utf8");
} catch {
  // index fallback is optional; buildInfo.js is the source of truth.
}
console.log(version);
