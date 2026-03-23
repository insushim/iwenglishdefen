const fs = require("fs");
const path = require("path");

function makeSVG(size) {
  const s = size,
    cx = s / 2,
    cy = s / 2,
    hz = s * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#1a1535"/>
      <stop offset="100%" stop-color="#0d0a1a"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${s * 0.35}" fill="none" stroke="rgba(100,150,255,0.3)" stroke-width="${s * 0.02}"/>
  <!-- Heart -->
  <g transform="translate(${cx},${cy + hz * 0.05})">
    <path d="M0,${hz * 0.35} C${-hz * 0.1},${hz * 0.1} ${-hz * 0.6},${hz * 0.1} ${-hz * 0.6},${-hz * 0.2} C${-hz * 0.6},${-hz * 0.55} ${-hz * 0.1},${-hz * 0.55} 0,${-hz * 0.25} C${hz * 0.1},${-hz * 0.55} ${hz * 0.6},${-hz * 0.55} ${hz * 0.6},${-hz * 0.2} C${hz * 0.6},${hz * 0.1} ${hz * 0.1},${hz * 0.1} 0,${hz * 0.35}Z" fill="#e81030"/>
    <circle cx="${-hz * 0.2}" cy="${-hz * 0.2}" r="${hz * 0.12}" fill="rgba(255,150,150,0.5)"/>
  </g>
  <!-- Cells -->
  <circle cx="${s * 0.15}" cy="${s * 0.2}" r="${s * 0.04}" fill="#ff4444"/>
  <circle cx="${s * 0.82}" cy="${s * 0.3}" r="${s * 0.035}" fill="#44ff44"/>
  <circle cx="${s * 0.2}" cy="${s * 0.78}" r="${s * 0.03}" fill="#4488ff"/>
  <circle cx="${s * 0.8}" cy="${s * 0.75}" r="${s * 0.04}" fill="#ffaa00"/>
  <!-- Bullet trails -->
  <line x1="${cx}" y1="${cy}" x2="${s * 0.85}" y2="${s * 0.15}" stroke="rgba(100,200,255,0.6)" stroke-width="${s * 0.015}"/>
  <line x1="${cx}" y1="${cy}" x2="${s * 0.1}" y2="${s * 0.12}" stroke="rgba(100,200,255,0.6)" stroke-width="${s * 0.015}"/>
</svg>`;
}

function makeOGImage() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0d0a1a"/>
  <circle cx="600" cy="280" r="120" fill="none" stroke="rgba(100,150,255,0.3)" stroke-width="4"/>
  <!-- Heart -->
  <g transform="translate(600,285)">
    <path d="M0,30 C-8,8 -50,8 -50,-17 C-50,-47 -8,-47 0,-21 C8,-47 50,-47 50,-17 C50,8 8,8 0,30Z" fill="#e81030"/>
    <circle cx="-15" cy="-17" r="8" fill="rgba(255,150,150,0.5)"/>
  </g>
  <!-- Cells -->
  <circle cx="200" cy="150" r="20" fill="#ff4444"/>
  <circle cx="1000" cy="200" r="18" fill="#44ff44"/>
  <circle cx="250" cy="480" r="15" fill="#4488ff"/>
  <circle cx="950" cy="460" r="20" fill="#ffaa00"/>
  <!-- Title -->
  <text x="600" y="490" text-anchor="middle" font-size="52" font-weight="bold" fill="#fff" font-family="sans-serif">셀 디펜더</text>
  <text x="600" y="540" text-anchor="middle" font-size="24" fill="#88aaff" font-family="sans-serif">Cell Defender - 영단어 학습 슈팅</text>
</svg>`;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const dir = path.dirname(__filename);

for (const sz of sizes) {
  fs.writeFileSync(path.join(dir, `icon-${sz}.svg`), makeSVG(sz));
}
fs.writeFileSync(path.join(dir, "icon-512-maskable.svg"), makeSVG(512));
fs.writeFileSync(path.join(dir, "apple-touch-icon.svg"), makeSVG(180));
fs.writeFileSync(path.join(dir, "og-image.svg"), makeOGImage());

console.log(
  "SVG icons generated! For PNG conversion use: sharp or browser rendering",
);
console.log(
  "For now, SVGs work as fallbacks. Update manifest to .svg if needed.",
);
