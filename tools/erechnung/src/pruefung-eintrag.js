// Einstieg des Prüfkerns (assets/erechnung/pruefung.js): fontoxpath mit exakter Dezimalrechnung (fxpatch.mjs) und der Interpreter
import * as fx from "fontoxpath-rv";
import { vorbereiten, pruefen } from "./pruefung.js";
window.RVPruefung = { fx, vorbereiten, pruefen };
