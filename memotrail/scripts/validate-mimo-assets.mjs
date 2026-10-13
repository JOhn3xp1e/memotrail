import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { parseMimoManifest, inspectMimoPixels, mimoStates, mimoPackStates } from '../src/lib/mimo-manifest.ts';

// Local files and a local headless browser only. No server, asset edits or DB access.
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const manifestPath = process.argv[2] ? resolve(process.argv[2]) : resolve(publicRoot, 'assets/mimo/manifest.json');
const artifactRoot = fileURLToPath(new URL('../artifacts/', import.meta.url));
const report = { format: '', ready: [], pending: [], candidate: [], errors: [], animations: {} };
let browser;
const sections = [];
try {
  const raw = JSON.parse((await readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''));
  const manifest = parseMimoManifest(raw, pathToFileURL(manifestPath).href);
  report.format = raw.format;
  const production = Object.entries(manifest).filter(([, animation]) => animation.status !== 'pending');
  if (production.length) {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: `window.inspectMimoPixels = ${inspectMimoPixels.toString()};` });
    for (const [name, animation] of production) {
      const metrics = [], frames = [];
      try {
        for (let index = 0; index < animation.frames.length; index++) {
          const frame = animation.frames[index];
          const path = fileURLToPath(frame.file);
          const within = relative(dirname(manifestPath), path);
          if (within.startsWith('..')) throw new Error('Frame path outside the asset pack');
          const bytes = await readFile(path);
          if (![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) throw new Error(`Not PNG: ${within}`);
          if (bytes.length > 3 * 1024 * 1024) throw new Error(`Frame exceeds PWA's 3 MiB cache limit: ${within}`);
          const data = `data:image/png;base64,${bytes.toString('base64')}`;
          const { preview, ...metric } = await page.evaluate(async ({ data, width, height, count, sourceX }) => {
            const image = new Image(); image.src = data; await image.decode();
            if (image.naturalWidth !== width * count || image.naturalHeight !== height) throw new Error('Inconsistent frame dimensions');
            const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(image, sourceX, 0, width, height, 0, 0, width, height);
            return { ...window.inspectMimoPixels(ctx.getImageData(0, 0, width, height).data, width, height), preview: canvas.toDataURL('image/png') };
          }, { data, width: animation.frameWidth, height: animation.frameHeight, count: animation.format === 'horizontal-strip' ? animation.frameCount : 1, sourceX: frame.sourceX ?? 0 });
          metrics.push({ file: within, durationMs: frame.durationMs, ...metric });
          frames.push(`<figure><div class="frame"><img src="${preview}" width="${animation.frameWidth}" height="${animation.frameHeight}" alt="${name} frame ${index + 1}"></div><figcaption>${index + 1}: ${within} (${frame.durationMs} ms)<br>Bounds: ${metric.minX},${metric.minY} – ${metric.maxX},${metric.maxY}</figcaption></figure>`);
        }
        report[animation.status === 'verified' ? 'ready' : 'candidate'].push(name);
        const spread = (key) => Math.max(...metrics.map((m) => m[key])) - Math.min(...metrics.map((m) => m[key]));
        report.animations[name] = { status: animation.status, metrics, centerSpreadPx: spread('centerX'), baselineSpreadPx: spread('baselineY'), note: 'Review alignment/scale visually: bounding boxes change with ears, props and intentional motion.' };
        sections.push(`<section><h2>${name} (${animation.status})</h2><p>${animation.loop ? 'Loop' : 'One shot'}; total ${animation.durationMs} ms. Check identity, scale, ground alignment and frame order. Center spread ${spread('centerX')}px; baseline spread ${spread('baselineY')}px.</p><div class="strip">${frames.join('')}</div></section>`);
      } catch (error) { report.errors.push(`${name}: ${error.message}`); }
    }
  }
  report.pending = (raw.format === 'horizontal-strip' ? mimoPackStates : mimoStates).filter((name) => !manifest[name] || manifest[name].status === 'pending');
} catch (error) { report.errors.push(error.message); }
finally { await browser?.close(); }

await mkdir(artifactRoot, { recursive: true });
await writeFile(resolve(artifactRoot, 'mimo-asset-validation.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(resolve(artifactRoot, 'mimo-frame-review.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Mimo frame review</title><style>body{font:14px system-ui;background:#faf7f2;color:#292524;padding:24px}.strip{display:flex;gap:12px;overflow:auto}figure{margin:0;flex:none;width:256px}figcaption{font-size:11px;overflow-wrap:anywhere}.frame{width:256px;height:256px;background:repeating-conic-gradient(#e1d5ed 0% 25%,#fff 0% 50%) 0/16px 16px;position:relative}.frame:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(to right,transparent calc(50% - .5px),#ad728e 50%,transparent calc(50% + .5px))}img{width:100%;height:100%;object-fit:contain}section{margin:24px 0}</style><h1>Mimo production frame review</h1><p>Ready: ${report.ready.join(', ') || 'none'}. Candidates: ${report.candidate.join(', ') || 'none'}. Pending: ${report.pending.join(', ')}.</p><p>Automated pixel checks cannot certify character identity or pose alignment. Review every frame before setting visualReview: true and status: verified.</p>${sections.join('')}</html>`);
console.log(`Mimo ready: ${report.ready.join(', ') || 'none'}`);
console.log(`Candidates: ${report.candidate.join(', ') || 'none'}; pending: ${report.pending.join(', ') || 'none'}`);
console.log('Reports: artifacts/mimo-asset-validation.json and artifacts/mimo-frame-review.html');
for (const error of report.errors) console.error(error);
if (report.errors.length) process.exitCode = 1;
