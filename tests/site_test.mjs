// Prüft den Schalter „Startseite – Landschaft“ ohne Worker: applyLandscape (worker/src/admin.js) auf der echten
// index.html und ob die Startseite in sich stimmig ist – die Bildpfade von Vogel und Ast passen zu data-landschaft
// (sonst blitzt beim Laden erst der lange und dann der kurze Ast auf).
//   node tests/site_test.mjs
import { readFileSync } from "node:fs";
import { applyLandscape } from "../worker/src/admin.js";
let fails = 0;
const check = (ok, label, detail = "") => { console.log((ok ? "  ok   " : "  FEHLT ") + label + (detail ? ` (${detail})` : "")); if (!ok) fails++; };
const root = new URL("..", import.meta.url).pathname;
const html = readFileSync(root + "index.html", "utf8");
const scene = h => (h.match(/<button class="scene"[\s\S]*?<\/button>/) || [""])[0];
const paths = h => [...scene(h).matchAll(/ (?:src|data-src)="([^"]+)"/g)].map(m => m[1]);
const spaet = h => [...scene(h).matchAll(/data-src-spaet="([^"]+)"/g)].map(m => m[1]); // Schnabelposen, erst beim Sprechen geladen
const state = h => (h.match(/data-landschaft="(an|aus)"/) || [])[1];
const branchWidth = h => +(scene(h).match(/ast\.webp"[^>]*?width="(\d+)"/) || [])[1];
const preloads = h => [...h.matchAll(/<link rel="preload" as="image" href="([^"]+)"/g)].map(m => m[1]);

// 1. Die Startseite, wie sie liegt
const s = state(html), p = paths(html);
check(s === "an" || s === "aus", "data-landschaft am <body> gesetzt", s);
check(p.length === 6, "Szene enthält sechs Bilder (Vogel, vier Flugposen, Ast)", p.length);
// Ordner der Szene (seit 23.10.2026): Ast in assets/, Vogel im Figurenpaket figuren/goch/bilder/, je mit bestand/ ohne Landschaft
const isBestand = x => /^(?:assets|figuren\/[a-z0-9-]+\/bilder)\/bestand\//.test(x);
const isLive = x => /^(?:assets|figuren\/[a-z0-9-]+\/bilder)\/(?!bestand\/)/.test(x);
const bestand = p.filter(isBestand).length;
check(s === "aus" ? bestand === 6 : bestand === 0, `Bildpfade passen zum Schalter „${s}“`, `${bestand} × …/bestand/`);
check(p.filter(x => x.startsWith("figuren/goch/bilder/")).length === 5 && p.filter(x => x.startsWith("assets/")).length === 1, "Vogel aus dem Figurenpaket, Ast aus assets/", p.join(", "));
check(branchWidth(html) === (s === "aus" ? 1153 : 2800), "Astbreite passt zum Schalter", branchWidth(html));
const pre = preloads(html);
check(pre.length >= 5 && pre.every(x => p.includes(x)), "Vorabladen im <head> nennt genau die Bilder der Szene", pre.join(", "));

// 2. Umschalten in beide Richtungen
const on = applyLandscape(html, "an"), off = applyLandscape(on, "aus");
check(state(on) === "an" && [...paths(on), ...preloads(on)].every(isLive) && branchWidth(on) === 2800, "an: ohne bestand/ (Szene und Vorabladen), Ast 2800 px");
check(state(off) === "aus" && [...paths(off), ...preloads(off)].every(isBestand) && branchWidth(off) === 1153, "aus: …/bestand/ (Szene und Vorabladen), Ast 1153 px");
check([...paths(off), ...preloads(off)].every(x => { try { readFileSync(root + x); return true; } catch { return false; } }) && [...paths(on), ...preloads(on)].every(x => { try { readFileSync(root + x); return true; } catch { return false; } }), "alle Bildpfade beider Fassungen gibt es als Datei");
check(spaet(html).length === 3 && spaet(on).every(isLive) && spaet(off).every(isBestand) && [...spaet(on), ...spaet(off)].every(x => { try { readFileSync(root + x); return true; } catch { return false; } }), "Schnabelposen und Blinzeln schalten mit (data-src-spaet) und liegen als Datei vor");
check(/'data-src-spaet'/.test(readFileSync(root + "landscape.js", "utf8")), "landscape.js tauscht auch die Schnabelposen");
check(applyLandscape(html, s) === html && applyLandscape(on, "an") === on, "Umschalten auf den bestehenden Zustand ändert nichts");
check((s === "aus" ? off : on) === html, "Rundreise an → aus liefert die Datei unverändert zurück");
const rest = h => h.replace(scene(h), "").replace(/<link rel="preload" as="image"[^>]*>/g, "").replace(/data-landschaft="(an|aus)"/, "").replace(/ data-landschaft-satz="[a-z0-9-]*"/, "");
check(rest(on) === rest(html), "außerhalb von Szene, Vorabladen und Schalter bleibt alles unberührt");
// Übergang: Die neue Redaktion schaltet auch eine Startseite mit den alten Pfaden (alles in assets/) richtig um –
// wichtig, wenn der Worker vor der Startseite deployt wird.
const alt = html.replaceAll("figuren/goch/bilder/", "assets/"), altAus = applyLandscape(alt, "aus");
check(paths(altAus).every(x => x.startsWith("assets/bestand/")) && paths(applyLandscape(altAus, "an")).every(x => x.startsWith("assets/") && !x.includes("bestand/")), "Übergang: alte Pfade (alles in assets/) werden ebenfalls umgeschaltet");
check(applyLandscape("<body data-landschaft=\"aus\"><p>kein Vogel</p>", "an") === "<body data-landschaft=\"an\"><p>kein Vogel</p>", "ohne Szene wird nur das Attribut gesetzt");

// 2b. Welcher Satz (data-landschaft-satz): gesetzt, gewechselt, nachgerüstet
const satz = h => (h.match(/data-landschaft-satz="([a-z0-9-]*)"/) || [])[1];
check(satz(html) === "burgberg-herbst", "Startseite nennt den Satz burgberg-herbst", satz(html));
check(satz(applyLandscape(html, "an", "meer")) === "meer" && satz(applyLandscape(html, "aus")) === "burgberg-herbst", "Satz wechselt mit, bleibt ohne Angabe erhalten");
check(applyLandscape("<body data-landschaft=\"aus\">", "an", "meer") === "<body data-landschaft=\"an\" data-landschaft-satz=\"meer\">", "fehlendes Satz-Attribut wird ergänzt");
const setJson = JSON.parse(readFileSync(root + "assets/landschaften/burgberg-herbst/landschaft.json", "utf8"));
check(setJson.ebenen.herbst.ferne && setJson.ebenen.herbst.krone && ["ferne-herbst-1400.webp", "ferne-herbst-800.webp", "krone-herbst-1000.webp", "krone-herbst-560.webp"].every(f => { try { readFileSync(root + "assets/landschaften/burgberg-herbst/" + f); return true; } catch { return false; } }), "Satz burgberg-herbst: Beschreibung und Dateien vorhanden");

// 3. landscape.js tauscht zur Laufzeit in beide Richtungen (dasselbe Muster wie im Skript)
const js = readFileSync(root + "landscape.js", "utf8");
check(/use\(true\)/.test(js) && /use\(false\)/.test(js), "landscape.js kennt beide Richtungen (use(true) = bestand/, use(false))");
const pattern = new RegExp((js.match(/SCENE_PATH = \/(.+)\/;/) || [])[1] || "^$");
const m1 = "figuren/goch/bilder/bestand/vogel.webp".match(pattern), m2 = "assets/ast.webp".match(pattern);
check(m1 && m1[1] === "figuren/goch/bilder/" && m1[2] === "vogel.webp" && m2 && m2[1] === "assets/" && m2[2] === "ast.webp", "Pfadmuster trennt Ordner und Dateinamen ab (Figurenpaket und assets/)");

console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen.` : "\nStartseite und Schalter in Ordnung.");
process.exit(fails ? 1 : 0);
