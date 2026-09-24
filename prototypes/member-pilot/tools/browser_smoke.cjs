#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

// Normal Node resolution also supports a caller-supplied NODE_PATH.
let chromium;
try {
  ({chromium} = require('playwright'));
} catch (error) {
  console.error('Playwright is required. Install it locally or set NODE_PATH to its node_modules directory.');
  process.exitCode = 1;
  return;
}

const fillPdf = String.raw`
import sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter

source, destination = map(Path, sys.argv[1:3])
reader = PdfReader(source)
writer = PdfWriter()
writer.clone_document_from_reader(reader)
values = {
    "org_name": "Smoke-Testkanzlei · rein synthetisch",
    "contact_name": "Alex Test",
    "contact_role": "Fiktive Kanzleileitung",
    "email": "smoke@example.invalid",
    "website": "https://example.invalid",
    "sector": "Kanzlei",
    "team_size": "6-15",
    "locations": "Fiktiver Teststandort",
    "purpose": "Ausschließlich synthetische Angaben für einen lokalen Browsercheck.",
    "strengths": "Gemeinsame Aufgabenübersicht im fiktiven Team.",
    "vision": "Neue Teammitglieder finden ihre nächsten Schritte.",
    "success": "Übergaben und offene Fragen werden nachvollziehbar.",
    "pain": "Wiederholte Rückfragen zu Zuständigkeiten.",
    "priority": "Einen fiktiven Übergabeprozess beschreiben.",
    "target_date": "Nur Testdaten; kein echter Termin",
    "process": "Eine fiktive Anfrage wird angenommen und intern zugeordnet.",
    "handoffs": "Der nächste Schritt ist manchmal unklar.",
    "tools": "Fiktives Fachsystem; keine Zugangsdaten.",
    "team_change": "Gemeinsam eine eindeutige Übergabe vereinbaren.",
    "constraints": "Nur ein begrenzter synthetischer Testfall.",
    "support_process": "/Yes",
    "support_people": "/Yes",
    "support_vision": "/Off",
    "support_delivery": "/Yes",
    "support_representation": "/Off",
    "collaboration": "Vorwiegend schriftlich",
    "information_flow": "Kurzer fiktiver schriftlicher Abgleich.",
    "expectation": "Eine gemeinsame Ausgangslage und ein nächster Schritt.",
    "open_questions": "Welche Übergabe braucht zuerst Klarheit?",
    "completed_on": "24.09.2026",
}
for page in writer.pages:
    writer.update_page_form_field_values(page, values, auto_regenerate=False)
writer.add_metadata({"/RVFormVersion": "rv-pilot-1", "/RVLanguage": "de"})
with destination.open("wb") as output:
    writer.write(output)
check = PdfReader(destination).get_fields()
assert str(check["org_name"]["/V"]) == values["org_name"]
assert str(check["support_process"]["/V"]) == "/Yes"
`;

function settings() {
  const appUrl = new URL(process.argv[2] || process.env.RV_PILOT_URL || 'http://127.0.0.1:8765/prototypes/member-pilot/');
  assert.equal(appUrl.protocol, 'http:', 'Use the local HTTP demo server.');
  assert.ok(['127.0.0.1', 'localhost'].includes(appUrl.hostname), 'This smoke test is restricted to a local synthetic-data demo.');
  assert.ok(!appUrl.username && !appUrl.password, 'Do not supply credentials.');
  if (appUrl.pathname === '/') appUrl.pathname = '/prototypes/member-pilot/';
  appUrl.searchParams.set('lang', 'de');
  appUrl.hash = '';
  return {appUrl, python: process.env.RV_PILOT_PYTHON || 'python3', chrome: process.env.RV_PILOT_CHROME};
}

async function submitAndWait(page, appUrl, route, action) {
  const expected = new URL(route, appUrl).href;
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url() === expected && r.request().method() === 'POST'),
    action(),
  ]);
  const body = await response.json();
  assert.equal(response.status(), 200, `${route}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const {appUrl, python, chrome} = settings();
  const prototypeDir = path.resolve(__dirname, '..');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rjl-pilot-smoke-'));
  const out = process.env.RV_PILOT_ARTIFACTS ? path.resolve(process.env.RV_PILOT_ARTIFACTS) : tempDir;
  fs.mkdirSync(out, {recursive: true});
  const sample = path.join(tempDir, 'smoke-questionnaire-de.pdf');
  const approvedName = `Demo-Unternehmen Weitblick · fiktiv ${Date.now()}`;
  const draftName = 'Draft only · synthetic';
  let browser;
  const errors = [];
  const layouts = [];
  try {
    const generated = spawnSync(python, ['-B', '-c', fillPdf, path.join(prototypeDir, 'downloads', 'pilot-questionnaire-de.pdf'), sample],
      {encoding: 'utf8', timeout: 30000});
    if (generated.error) throw new Error(`Could not run Python with pypdf: ${generated.error.message}`);
    assert.equal(generated.status, 0, `Could not create the synthetic PDF: ${generated.stderr || generated.stdout}`);
    assert.ok(fs.statSync(sample).size <= 2 * 1024 * 1024, 'Synthetic PDF must fit the import limit.');

    browser = await chromium.launch({headless: true, ...(chrome ? {executablePath: chrome} : {channel: 'chrome'})});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const initial = await page.goto(appUrl.href);
    assert.equal(initial.status(), 200, 'The local prototype must be available.');
    await page.waitForFunction(() => state.schema && state.connected && state.profile);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => state.profile.id), 'demo-firm', 'Only the synthetic demo profile is supported.');
    const original = await page.evaluate(() => state.profile.fields.org_name);
    await page.screenshot({path: path.join(out, 'welcome-de.png'), fullPage: true});

    await page.locator('#admin-toggle').click();
    await page.locator('#pdf-file').setInputFiles(sample);
    const imported = await submitAndWait(page, appUrl, '/api/import', () => page.locator('#upload-form button[type=submit]').click());
    await page.waitForFunction(id => !state.busy && state.draft?.id === id, imported.draft.id);
    await page.locator('#review-org_name').waitFor();
    assert.equal(await page.evaluate(() => state.profile.fields.org_name), original, 'Import must not replace the approved profile.');
    assert.equal(await page.locator('#publish-profile').isDisabled(), true);
    assert.equal(imported.draft.fields.support_process, true);
    assert.equal(imported.draft.fields.support_vision, false);
    await page.locator('#review-org_name').fill(approvedName);
    await page.locator('#informal-approved').check();
    await page.locator('#segment').selectOption('business');
    await page.locator('#review-note').fill('Fiktive Sichtung: Rechnungseingang als erster Schwerpunkt.');
    await page.locator('#followup-date').fill('2026-10-27');
    await page.locator('#followup-note').fill('Fiktive Rückfrage: Welche Übergabe braucht zuerst Klarheit?');
    await page.locator('#review-confirm').check();
    await page.screenshot({path: path.join(out, 'admin-review.png'), fullPage: true});
    await submitAndWait(page, appUrl, '/api/publish', () => page.locator('#publish-profile').click());
    await page.waitForFunction(name => !state.busy && state.profile.fields.org_name === name && !state.draft, approvedName);
    await page.locator('#prepare-invitation').click();
    await page.locator('#preview-invitation').click();
    await page.locator('#voucher-panel').waitFor({state: 'visible'});
    assert.match(await page.locator('main').innerText(), /deines Unternehmens/);
    await page.locator('#voucher-form button').click();
    await page.waitForFunction(() => state.view === 'collaboration');
    const content = await page.locator('main').innerText();
    assert.match(content, /Deine Richtung/);
    assert.match(content, /Fiktive Sichtung/);
    assert.match(content, /27\. Oktober 2026/);
    assert.match(content, /Welche Übergabe/);
    await page.screenshot({path: path.join(out, 'collaboration-de.png'), fullPage: true});

    await page.locator('a[href="#resources"]').first().click();
    await page.waitForFunction(() => state.view === 'resources');
    assert.equal(await page.locator('[data-resource="einvoice"]').count(), 1);
    assert.equal(await page.locator('[data-resource="onboarding"]').count(), 0);
    await page.locator('[data-resource="einvoice"]').click();
    assert.match(await page.locator('#dialog-content').innerText(), /geplante Tool/);
    await page.locator('#close-dialog').click();
    await page.locator('a[href="#support"]').first().click();
    await page.waitForFunction(() => state.view === 'support');
    assert.equal(await page.locator('[data-slot]').count(), 5);
    await page.locator('[data-slot="0"]').click();
    assert.match(await page.locator('#request-text').inputValue(), /2026-10-16/);
    await page.locator('#request-form button').click();
    await page.locator('#save-request').click();
    assert.equal(await page.evaluate(() => state.localRequests.length), 1);
    await page.locator('[data-language="en"]').click();
    assert.match(await page.locator('h1').innerText(), /good question/);
    await page.screenshot({path: path.join(out, 'requests-en.png'), fullPage: true});

    await page.locator('#admin-toggle').click();
    await page.evaluate(() => { location.hash = 'onboarding'; });
    await page.locator('#intake-org_name').fill(draftName);
    const intake = await submitAndWait(page, appUrl, '/api/intake', () => page.locator('#save-intake').click());
    await page.waitForFunction(id => !state.busy && state.draft?.id === id, intake.draft.id);
    assert.equal(await page.evaluate(() => state.draft.fields.org_name), draftName);
    assert.equal(await page.evaluate(() => state.profile.fields.org_name), approvedName);
    await page.locator('#toggle-intake').click();
    assert.ok(await page.locator('[data-field]').count() > 4);
    await page.locator('#toggle-intake').click();
    assert.equal(await page.locator('#intake-org_name').inputValue(), draftName);

    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 900});
      for (const lang of ['de', 'en']) {
        await page.locator(`[data-language="${lang}"]`).click();
        for (const route of ['welcome', 'collaboration', 'requests', 'resources', 'support', 'admin', 'onboarding']) {
          await page.evaluate(value => { location.hash = value; }, route);
          await page.waitForFunction(value => state.view === value, route);
          await page.locator('h1').waitFor({state: 'visible'});
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
          assert.equal(overflow, false, `${route} ${lang} ${width}: horizontal overflow`);
          layouts.push(`${width}/${lang}/${route}`);
          if (width === 390 && lang === 'de' && route === 'collaboration') {
            await page.screenshot({path: path.join(out, 'mobile-de.png'), fullPage: true});
          }
        }
      }
    }
    const download = await page.request.get(new URL('/downloads/pilot-questionnaire-de.pdf', appUrl).href);
    assert.equal(download.status(), 200);
    assert.equal((await download.body()).subarray(0, 4).toString(), '%PDF');
    assert.deepEqual(errors, []);
    const result = {success: true, layouts: layouts.length, url: appUrl.href,
      checks: ['PDF import preserves profile', 'explicit approval', 'DE/EN', 'Du/Sie permission',
        'business personalization', 'follow-up and review note', 'five fictional slots',
        'local request only', 'future intake stays draft', 'PDF download', 'no console errors', 'responsive overflow'], errors};
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({...result, artifacts: out}, null, 2));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({success: false, url: appUrl.href,
      error: error.message, completedLayouts: layouts, browserErrors: errors}, null, 2));
    console.error(`Smoke-test artifacts: ${out}`);
    throw error;
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      fs.rmSync(sample, {force: true});
    }
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
