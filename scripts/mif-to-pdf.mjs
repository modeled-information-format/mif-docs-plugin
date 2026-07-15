#!/usr/bin/env node
// mif-to-pdf.mjs — convert a MIF JSON-LD document to PDF, embedding every MIF
// field as PDF metadata: the standard Info dictionary (best-effort mapped)
// PLUS a custom XMP metadata stream carrying the full document losslessly.
//
//   mif-to-pdf <doc.json> [--output out.pdf]
//
// Input is MIF JSON-LD ONLY — this script does not parse Markdown. For a
// Markdown source, convert it first with the existing suite tooling:
//   node scripts/mif-convert.mjs emit-jsonld <doc.md> > <doc.json>
//   node scripts/mif-validate.mjs <doc.md> --level 1   # conformance gate
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const TITLE_SIZE = 18;
const BODY_SIZE = 11;
const LINE_HEIGHT = 15;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
const XMP_NS = "https://mif-spec.dev/ns#";

function usageExit(code) {
  console.error("usage: mif-to-pdf <doc.json> [--output out.pdf]");
  process.exit(code);
}

function readJsonld(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    console.error(`mif-to-pdf: cannot read ${file}: ${e.message}`);
    process.exit(1);
  }
  let jsonld;
  try {
    jsonld = JSON.parse(text);
  } catch (e) {
    console.error(`mif-to-pdf: ${file} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  if (jsonld["@id"] === undefined || jsonld.conceptType === undefined || jsonld.created === undefined) {
    console.error(
      `mif-to-pdf: ${file} is missing a required MIF L1 field (@id/conceptType/created) — ` +
        "not a MIF JSON-LD document. For a Markdown source, convert it first with " +
        "`node scripts/mif-convert.mjs emit-jsonld <doc.md>` and gate it with `mif-validate`.",
    );
    process.exit(1);
  }
  return jsonld;
}

function wrapLine(text, font, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (cur && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function renderBody(doc, font, boldFont, title, bodyText) {
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function drawLine(text, f, size) {
    if (y < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(text, { x: MARGIN, y, size, font: f, color: rgb(0, 0, 0) });
    y -= LINE_HEIGHT;
  }

  for (const line of wrapLine(title, boldFont, TITLE_SIZE, MAX_WIDTH)) drawLine(line, boldFont, TITLE_SIZE);
  y -= LINE_HEIGHT / 2;

  const paragraphs = String(bodyText).split(/\n{2,}/);
  for (const para of paragraphs) {
    for (const line of wrapLine(para.replace(/\s*\n\s*/g, " "), font, BODY_SIZE, MAX_WIDTH)) {
      drawLine(line, font, BODY_SIZE);
    }
    y -= LINE_HEIGHT / 2;
  }
}

// Best-effort mapping onto the standard PDF Info dictionary. This is a
// convenience projection for viewers that only read Info — it is lossy by
// nature (e.g. citations[]/relationships[] have no Info-dict home), which is
// exactly why the XMP packet below carries the full document separately.
function setInfoDictionary(doc, jsonld, title) {
  doc.setTitle(title);
  const author = jsonld.entity?.name ?? jsonld.provenance?.wasAttributedTo?.["@id"];
  if (author) doc.setAuthor(String(author));
  if (jsonld.namespace) doc.setSubject(String(jsonld.namespace));
  if (Array.isArray(jsonld.tags) && jsonld.tags.length) doc.setKeywords(jsonld.tags.map(String));
  if (jsonld.provenance?.agent) doc.setCreator(String(jsonld.provenance.agent));
  doc.setProducer("mif-to-pdf (mif-docs-plugin)");
  if (jsonld.created) doc.setCreationDate(new Date(jsonld.created));
  doc.setModificationDate(new Date(jsonld.modified ?? jsonld.created));
}

function xmlEscape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Embed the full source MIF JSON-LD document verbatim as one XMP property.
// This is the losslessness guarantee: every field the source carries — not
// just the ones with a standard Info-dict or Dublin Core home — round-trips
// through the produced PDF, because it is the same JSON string.
function buildXmpPacket(jsonld) {
  const payload = xmlEscape(JSON.stringify(jsonld));
  return [
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">`,
    `  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
    `    <rdf:Description rdf:about="" xmlns:mif="${XMP_NS}">`,
    `      <mif:document>${payload}</mif:document>`,
    `    </rdf:Description>`,
    `  </rdf:RDF>`,
    `</x:xmpmeta>`,
    `<?xpacket end="w"?>`,
  ].join("\n");
}

function attachXmpMetadata(doc, jsonld) {
  const xmpBytes = new TextEncoder().encode(buildXmpPacket(jsonld));
  const streamDict = doc.context.obj({ Type: "Metadata", Subtype: "XML", Length: xmpBytes.length });
  const stream = PDFRawStream.of(streamDict, xmpBytes);
  const streamRef = doc.context.register(stream);
  doc.catalog.set(PDFName.of("Metadata"), streamRef);
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const outIdx = args.indexOf("--output");
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
  if (!file) usageExit(2);

  const jsonld = readJsonld(file);
  const title = jsonld.title ?? jsonld["@id"];
  const output = outPath || `${basename(file, extname(file))}.pdf`;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  renderBody(doc, font, boldFont, title, jsonld.content ?? "");
  setInfoDictionary(doc, jsonld, title);
  attachXmpMetadata(doc, jsonld);

  const bytes = await doc.save();
  writeFileSync(output, bytes);
  console.log(`mif-to-pdf: wrote ${output} (${bytes.length} bytes)`);
}

main();
