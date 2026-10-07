#!/usr/bin/env node
// Renders the profile README's SVG assets in dark and light variants from one source of truth.
//
//   node scripts/render-assets.mjs   →   assets/{hero,impact,flow}-{dark,light}.svg
//
// GitHub serves README images through a proxy that blocks external fonts, so OFL-1.1 subsets of
// Geist, Geist Mono, and Instrument Serif (scripts/fonts, licenses alongside) are embedded as data
// URIs. The typewriter uses SMIL so it runs in every browser; CSS-only motion and the typewriter
// both switch to static text under prefers-reduced-motion.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base64 = (path) => readFileSync(join(root, 'scripts', path)).toString('base64');
const fontFiles = {
  sans: ['Geist', 'fonts/geist.woff2', 'normal', '100 900'],
  mono: ['Geist Mono', 'fonts/geist-mono.woff2', 'normal', '100 900'],
  serif: ['Instrument Serif', 'fonts/instrument-serif.woff2', 'normal', '400'],
  serifItalic: ['Instrument Serif', 'fonts/instrument-serif-italic.woff2', 'italic', '400'],
};

const themes = {
  dark: {
    bg: '#0b0e0c', surface: '#121713', text: '#f2f4ed', muted: '#a4afa6', subtle: '#929e95',
    accent: '#c4f078', middle: '#a2d7b3', end: '#f2f4ed', line: '#263028', lineStrong: '#3a473d',
    grid: '#26332a', avatarGlow: '#4f6135', haloOpacity: 0.2, grain: 0.07,
  },
  light: {
    bg: '#f5f5ef', surface: '#ffffff', text: '#1b241b', muted: '#52604f', subtle: '#586853',
    accent: '#416218', middle: '#234c3d', end: '#2e4a16', line: '#d2d9cb', lineStrong: '#b5c0ac',
    grid: '#d3dccb', avatarGlow: '#bec9b0', haloOpacity: 0.16, grain: 0.05,
  },
};

const content = {
  location: 'Jakarta, Indonesia · Open to remote',
  eyebrow: 'PLATFORM ENGINEERING / RELIABILITY / AGENTIC AI',
  greeting: 'Hi, I’m',
  firstName: 'Ahmad',
  lastName: 'Lamaul Farid',
  roles: ['Senior DevOps Engineer', 'Platform Engineer', 'Site Reliability Engineer', 'AIOps & FinOps builder'],
  nodes: [['Cloud', 'Multi-cloud / K8s'], ['Delivery', 'IaC / GitOps'], ['Telemetry', 'SLI / SLO'], ['AI agents', 'MCP / OPA']],
  outcomes: [
    ['~50%', 'Lower monthly cloud spend', 'Cloud consolidation, rightsizing, and resource governance.'],
    ['30+', 'Production services migrated', 'A phased multi-cloud cutover with no customer-facing downtime.'],
    ['35%', 'Lower mean time to resolve', 'Actionable SLI and alerting standards with less alert noise.'],
  ],
  outcomesNote: 'RÉSUMÉ-REPORTED OUTCOMES FROM GENIEBOOK · NOT LIVE TELEMETRY',
  steps: [['Observe', 'Read-scoped MCP'], ['Investigate', 'LangGraph + RAG'], ['Evaluate', 'OPA policy checks'], ['Approve', 'Human confirmation'], ['Act', 'Temporal workflows']],
  flowNote: 'AN INTENDED OPERATING MODEL, NOT A DEPLOYED PRODUCTION SYSTEM · HUMANS APPROVE PRODUCTION CHANGES',
};

const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONO_ADVANCE = 0.6; // Geist Mono advance width in em; lets mono text widths be computed exactly.
const EASE = 'cubic-bezier(.16,1,.3,1)';

function fontFaces(keys) {
  return keys.map((key) => {
    const [family, file, style, weight] = fontFiles[key];
    return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};src:url(data:font/woff2;base64,${base64(file)}) format('woff2')}`;
  }).join('');
}

function frame(t, width, height, id) {
  return {
    defs: `<radialGradient id="${id}-halo" cx="0.82" cy="0.08" r="0.7"><stop offset="0" stop-color="${t.accent}" stop-opacity="${t.haloOpacity}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-wash" cx="0.04" cy="1" r="0.55"><stop offset="0" stop-color="${t.accent}" stop-opacity="${t.haloOpacity / 3}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
<filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
<clipPath id="${id}-frame"><rect width="${width}" height="${height}" rx="24"/></clipPath>`,
    back: `<g clip-path="url(#${id}-frame)"><rect width="${width}" height="${height}" fill="${t.bg}"/><rect width="${width}" height="${height}" fill="url(#${id}-halo)"/><rect width="${width}" height="${height}" fill="url(#${id}-wash)"/><rect width="${width}" height="${height}" filter="url(#${id}-grain)" opacity="${t.grain}"/></g>`,
    border: `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="23.5" fill="none" stroke="${t.line}"/>`,
  };
}

function svg({ width, height, title, desc, fonts, css, defs, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<defs>
<style>${fontFaces(fonts)}
.sans{font-family:'Geist',-apple-system,'Segoe UI',sans-serif}.mono{font-family:'Geist Mono',ui-monospace,monospace}.serif{font-family:'Instrument Serif',Georgia,serif}
.rise{animation:rise 1s ${EASE} both}
@keyframes rise{from{opacity:0;transform:translateY(14px)}}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
${defs}
</defs>
${body}
</svg>
`;
}

// Discrete SMIL timelines: each role types, holds, deletes; one caret follows whichever role is active.
function typewriter(roles, { x0, charWidth }) {
  const TYPE = 0.065, HOLD = 1.9, DELETE = 0.03, GAP = 0.4;
  let clock = 0;
  const tracks = roles.map((role) => {
    const start = clock;
    const n = role.length;
    const points = [[0, 0]];
    for (let k = 1; k <= n; k++) points.push([start + k * TYPE, k * charWidth]);
    const holdEnd = start + n * TYPE + HOLD;
    for (let k = n - 1; k >= 0; k--) points.push([holdEnd + (n - k) * DELETE, k * charWidth]);
    clock = holdEnd + n * DELETE + GAP;
    return points;
  });
  const duration = clock;
  const timeline = (points) => {
    const unique = new Map();
    for (const [time, value] of points.sort((a, b) => a[0] - b[0])) unique.set((time / duration).toFixed(5), value.toFixed(2));
    return `calcMode="discrete" dur="${duration.toFixed(3)}s" repeatCount="indefinite" keyTimes="${[...unique.keys()].join(';')}" values="${[...unique.values()].join(';')}"`;
  };
  return {
    widths: tracks.map(timeline),
    caret: timeline([[0, x0], ...tracks.flatMap((points) => points.slice(1).map(([time, width]) => [time, x0 + width]))]),
  };
}

function hero(t, mode) {
  const W = 1200, H = 440, id = 'h';
  const f = frame(t, W, H, id);
  const center = [960, 220];
  const pillText = content.location;
  const pillWidth = Math.round(pillText.length * MONO_ADVANCE * 12 + 48);
  const roleSize = 24;
  const charWidth = roleSize * MONO_ADVANCE;
  const x0 = 64 + charWidth * 2;
  const type = typewriter(content.roles, { x0, charWidth });
  const orbitR = 178;
  const chipAngles = [-145, -35, 145, 35];
  const chips = content.nodes.map(([title, detail], index) => {
    const angle = (chipAngles[index] * Math.PI) / 180;
    const cx = center[0] + orbitR * Math.cos(angle), cy = center[1] + orbitR * Math.sin(angle);
    return `<g class="float" style="animation-delay:${-index * 1.6}s"><rect x="${cx - 64}" y="${cy - 25}" width="128" height="50" rx="12" fill="${t.surface}" stroke="${t.line}"/><text x="${cx}" y="${cy - 3}" text-anchor="middle" class="sans" font-size="13" font-weight="600" fill="${t.text}">${esc(title)}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" class="mono" font-size="10" fill="${t.subtle}">${esc(detail)}</text></g>`;
  }).join('');
  const css = `.d1{animation-delay:.08s}.d2{animation-delay:.16s}.d3{animation-delay:.26s}.d4{animation-delay:.4s}.d5{animation-delay:.5s}
.spin{transform-origin:${center[0]}px ${center[1]}px;animation:spin 60s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.float{animation:float 7s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-5px)}}
.ping{transform-box:fill-box;transform-origin:center;animation:ping 2.6s ease-out infinite}
@keyframes ping{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(3.2)}}
.static-role{display:none}
@media (prefers-reduced-motion:reduce){.typed{display:none}.static-role{display:inline}}`;
  const defs = `${f.defs}
<pattern id="h-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="${t.grid}"/></pattern>
<radialGradient id="h-dotfade" cx="${center[0]}" cy="${center[1]}" r="330" gradientUnits="userSpaceOnUse"><stop offset="0.3" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
<mask id="h-dotmask"><rect width="${W}" height="${H}" fill="url(#h-dotfade)"/></mask>
<linearGradient id="h-name" x1="64" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.accent}"/><stop offset="0.55" stop-color="${t.middle}"/><stop offset="1" stop-color="${t.end}"/></linearGradient>
<radialGradient id="h-avatar" cx="0.5" cy="0.36" r="0.62"><stop offset="0" stop-color="${t.avatarGlow}"/><stop offset="1" stop-color="${t.surface}"/></radialGradient>
<radialGradient id="h-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0.55" stop-color="${t.accent}" stop-opacity="${t.haloOpacity}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
<clipPath id="h-portrait"><circle cx="${center[0]}" cy="${center[1]}" r="128"/></clipPath>
${type.widths.map((_, index) => `<clipPath id="h-role-${index}"><rect x="${x0}" y="336" width="0" height="40"><animate attributeName="width" ${type.widths[index]}/></rect></clipPath>`).join('\n')}`;
  const body = `${f.back}
<rect width="${W}" height="${H}" fill="url(#h-dots)" mask="url(#h-dotmask)"/>
<g class="rise"><g transform="translate(64 52)"><rect width="${pillWidth}" height="34" rx="17" fill="${t.surface}" fill-opacity="0.7" stroke="${t.line}"/><circle class="ping" cx="20" cy="17" r="4" fill="none" stroke="${t.accent}"/><circle cx="20" cy="17" r="4" fill="${t.accent}"/><text x="34" y="21.5" class="mono" font-size="12" fill="${t.muted}">${esc(pillText)}</text></g>
<text x="${64 + pillWidth + 20}" y="73.5" class="mono" font-size="11" letter-spacing="1" fill="${t.subtle}">${esc(content.eyebrow)}</text></g>
<text x="64" y="152" class="sans rise d1" font-size="17" font-weight="500" fill="${t.muted}">${esc(content.greeting)}</text>
<text x="60" y="224" class="sans rise d2" font-size="80" font-weight="600" letter-spacing="-4" fill="${t.text}">${esc(content.firstName)}</text>
<text x="62" y="306" class="serif rise d3" font-style="italic" font-size="90" letter-spacing="-1" fill="url(#h-name)">${esc(content.lastName)}</text>
<g class="rise d4"><text x="64" y="367" class="mono" font-size="${roleSize}" font-weight="500" fill="${t.accent}">&gt;</text>
<g class="typed">${content.roles.map((role, index) => `<text x="${x0}" y="367" clip-path="url(#h-role-${index})" class="mono" font-size="${roleSize}" font-weight="500" fill="${t.text}">${esc(role)}</text>`).join('')}
<rect x="${x0}" y="345" width="11" height="28" rx="1.5" fill="${t.accent}" fill-opacity="0.85"><animate attributeName="x" ${type.caret}/><animate attributeName="opacity" values="1;0" keyTimes="0;0.5" calcMode="discrete" dur="1.05s" repeatCount="indefinite"/></rect></g>
<text x="${x0}" y="367" class="mono static-role" font-size="${roleSize}" font-weight="500" fill="${t.text}">${esc(content.roles[0])}</text></g>
<g class="rise d5">
<circle cx="${center[0]}" cy="${center[1]}" r="215" fill="url(#h-glow)"/>
<g class="spin"><circle cx="${center[0]}" cy="${center[1]}" r="${orbitR}" fill="none" stroke="${t.accent}" stroke-opacity="0.45" stroke-dasharray="3 9"/><circle cx="${center[0] + orbitR}" cy="${center[1]}" r="4" fill="${t.accent}"/><circle cx="${center[0] - orbitR}" cy="${center[1]}" r="2.5" fill="${t.accent}" fill-opacity="0.6"/></g>
<circle cx="${center[0]}" cy="${center[1]}" r="146" fill="none" stroke="${t.lineStrong}"/>
<circle cx="${center[0]}" cy="${center[1]}" r="128" fill="url(#h-avatar)"/>
<image href="data:image/webp;base64,${base64('portrait.webp')}" x="${center[0] - 128}" y="${center[1] - 128}" width="256" height="256" clip-path="url(#h-portrait)" preserveAspectRatio="xMidYMid slice"/>
<circle cx="${center[0]}" cy="${center[1]}" r="128.5" fill="none" stroke="${t.accent}" stroke-width="1.5"/>
${chips}</g>
${f.border}`;
  return svg({ width: W, height: H, title: `${content.firstName} ${content.lastName}`, desc: `${content.roles.join(', ')}. ${content.location}. ${mode} theme.`, fonts: ['sans', 'mono', 'serifItalic'], css, defs, body });
}

// Greedy word wrap by an average glyph width; only used for short, known descriptions.
function wrap(text, maxChars) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const line = lines[lines.length - 1];
    if (line && (line + ' ' + word).length > maxChars) lines.push(word);
    else lines[lines.length - 1] = line ? `${line} ${word}` : word;
  }
  return lines;
}

function impact(t, mode) {
  const W = 1200, H = 284, id = 'i';
  const f = frame(t, W, H, id);
  const column = W / content.outcomes.length;
  const columns = content.outcomes.map(([value, label, description], index) => {
    const x = index * column + 48;
    const lines = wrap(description, 44).map((line, n) => `<tspan x="${x}" dy="${n ? 21 : 0}">${esc(line)}</tspan>`).join('');
    return `<g class="rise" style="animation-delay:${0.1 + index * 0.12}s"><text x="${x - 2}" y="118" class="serif" font-size="78" fill="url(#i-num)">${esc(value)}</text>
<rect class="draw" style="animation-delay:${0.45 + index * 0.12}s" x="${x}" y="136" width="56" height="2" rx="1" fill="${t.accent}"/>
<text x="${x}" y="170" class="sans" font-size="17" font-weight="600" fill="${t.text}">${esc(label)}</text>
<text x="${x}" y="196" class="sans" font-size="14" fill="${t.muted}">${lines}</text></g>${index ? `<line x1="${index * column}" y1="44" x2="${index * column}" y2="214" stroke="${t.line}"/>` : ''}`;
  }).join('\n');
  const css = `.draw{transform-box:fill-box;transform-origin:left;animation:draw 1.1s ${EASE} both}
@keyframes draw{from{transform:scaleX(0)}}`;
  const defs = `${f.defs}
<linearGradient id="i-num" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.middle}"/></linearGradient>`;
  const body = `${f.back}
${columns}
<line x1="48" y1="238" x2="${W - 48}" y2="238" stroke="${t.line}"/>
<text x="48" y="262" class="mono" font-size="10.5" letter-spacing="1" fill="${t.subtle}">${esc(content.outcomesNote)}</text>
${f.border}`;
  const desc = content.outcomes.map(([value, label]) => `${value} ${label.toLowerCase()}`).join('; ');
  return svg({ width: W, height: H, title: 'Production outcomes', desc: `${desc}. Résumé-reported, not live telemetry. ${mode} theme.`, fonts: ['sans', 'mono', 'serif'], css, defs, body });
}

function flow(t, mode) {
  const W = 1200, H = 290, id = 'f';
  const f = frame(t, W, H, id);
  const gap = 24, boxW = (W - 96 - gap * (content.steps.length - 1)) / content.steps.length, top = 96, boxH = 124;
  const cycle = content.steps.length * 1.5;
  const human = content.steps.findIndex(([title]) => title === 'Approve');
  const boxes = content.steps.map(([title, detail], index) => {
    const x = 48 + index * (boxW + gap);
    const isHuman = index === human;
    const connector = index < content.steps.length - 1
      ? `<path class="link" style="animation-delay:${index * 1.5 + 0.6}s" d="M${x + boxW + 5} ${top + boxH / 2}h${gap - 10}m-5 -4l5 4l-5 4" fill="none" stroke="${t.lineStrong}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
      : '';
    return `<g class="rise" style="animation-delay:${0.08 * index}s"><rect class="${isHuman ? 'human' : 'step'}" style="animation-delay:${index * 1.5}s" x="${x}" y="${top}" width="${boxW}" height="${boxH}" rx="14" fill="${t.surface}" stroke="${isHuman ? t.accent : t.line}" stroke-width="${isHuman ? 1.5 : 1}"/>
<text x="${x + 20}" y="${top + 32}" class="mono" font-size="12" fill="${t.subtle}">${String(index + 1).padStart(2, '0')}</text>${isHuman ? `<text x="${x + boxW - 20}" y="${top + 32}" text-anchor="end" class="mono" font-size="10" letter-spacing="1" fill="${t.accent}">HUMAN GATE</text>` : ''}
<text x="${x + 20}" y="${top + 78}" class="sans" font-size="21" font-weight="600" fill="${isHuman ? t.accent : t.text}">${esc(title)}</text>
<text x="${x + 20}" y="${top + 102}" class="mono" font-size="12" fill="${t.muted}">${esc(detail)}</text></g>${connector}`;
  }).join('\n');
  const css = `.step{animation:step ${cycle}s ease-in-out infinite}
@keyframes step{0%,26%,100%{stroke:${t.line}}9%{stroke:${t.accent}}}
.link{animation:link ${cycle}s ease-in-out infinite}
@keyframes link{0%,22%,100%{stroke:${t.lineStrong}}8%{stroke:${t.accent}}}
.human{animation:human ${cycle}s ease-in-out infinite}
@keyframes human{0%,26%,100%{stroke-width:1.5}9%{stroke-width:3}}
.ping{transform-box:fill-box;transform-origin:center;animation:ping 2.6s ease-out infinite}
@keyframes ping{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(3.2)}}`;
  const label = 'In development';
  const pillWidth = Math.round(label.length * MONO_ADVANCE * 12 + 48);
  const body = `${f.back}
<g transform="translate(48 34)"><rect width="${pillWidth}" height="32" rx="16" fill="none" stroke="${t.accent}"/><circle class="ping" cx="19" cy="16" r="3.5" fill="none" stroke="${t.accent}"/><circle cx="19" cy="16" r="3.5" fill="${t.accent}"/><text x="32" y="20.5" class="mono" font-size="12" fill="${t.accent}">${label}</text></g>
<text x="${W - 48}" y="55" text-anchor="end" class="mono" font-size="11" letter-spacing="1" fill="${t.subtle}">AGENTIC SRE / LANGGRAPH + TEMPORAL</text>
${boxes}
<text x="48" y="262" class="mono" font-size="10.5" letter-spacing="1" fill="${t.subtle}">${esc(content.flowNote)}</text>
${f.border}`;
  const desc = `Planned agentic SRE workflow: ${content.steps.map(([title, detail]) => `${title} (${detail})`).join(', then ')}. In development; not a deployed production system. ${mode} theme.`;
  return svg({ width: W, height: H, title: 'Agentic SRE workflow', desc, fonts: ['sans', 'mono'], css, defs: f.defs, body });
}

mkdirSync(join(root, 'assets'), { recursive: true });
for (const [mode, theme] of Object.entries(themes)) {
  for (const [name, render] of Object.entries({ hero, impact, flow })) {
    const file = join(root, 'assets', `${name}-${mode}.svg`);
    writeFileSync(file, render(theme, mode));
    console.log(`wrote ${file.replace(root + '/', '')}`);
  }
}
