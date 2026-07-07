import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const BLUE = rgb(0.05, 0.27, 0.62);
const RED = rgb(0.75, 0.1, 0.1);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.95, 0.95, 0.95);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);

function fmt(n) {
  return n ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}

function pct(n) {
  return n != null ? `${(n * 100).toFixed(1)}%` : 'N/A';
}

export async function generateEvidencePackage({ parcel, municipality, analysis, comps }) {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  // ─── PAGE 1: Summary ────────────────────────────────────────────────────────
  const p1 = doc.addPage([612, 792]); // Letter
  const { width, height } = p1.getSize();
  let y = height - 40;

  // Header bar
  p1.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: BLUE });
  p1.drawText('NY PROPERTY TAX GRIEVANCE — EVIDENCE PACKAGE', {
    x: 30, y: height - 35, size: 14, font: bold, color: WHITE,
  });
  p1.drawText(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
    x: 30, y: height - 55, size: 9, font: regular, color: rgb(0.8, 0.85, 1),
  });
  p1.drawText('Not legal advice — For use with Form RP-524 grievance filing', {
    x: 200, y: height - 55, size: 8, font: regular, color: rgb(0.8, 0.85, 1),
  });

  y = height - 90;

  // Property section
  drawSectionHeader(p1, bold, 'SUBJECT PROPERTY', 30, y, width - 60);
  y -= 18;

  const fields1 = [
    ['Property Address', parcel.address],
    ['Municipality', `${parcel.municipality}, ${parcel.county} County`],
    ['School District', parcel.schoolDistrict || 'N/A'],
    ['Owner of Record', parcel.ownerName || 'N/A'],
    ['Parcel / Tax Map ID', parcel.printKey],
    ['Property Class', `${parcel.propertyClass} — ${parcel.propertyClassDesc}`],
    ['Assessment Roll Year', parcel.rollYear || '2025'],
  ];

  for (const [label, value] of fields1) {
    drawFieldRow(p1, regular, bold, label, value, 30, y, width - 60);
    y -= 16;
  }

  y -= 10;

  // Assessment values
  drawSectionHeader(p1, bold, 'ASSESSMENT VALUES', 30, y, width - 60);
  y -= 18;

  const vals = [
    ['Total Assessment', fmt(parcel.assessmentTotal), 'Assessor\'s official assessed value'],
    ['Full Market Value (Assessor)', fmt(parcel.fullMarketValue), 'Assessor\'s estimate of market value'],
    ['Assessor\'s Implied Market Value', fmt(analysis.assessorMarketValue), `Assessment ÷ ${(municipality.equalizationRate * 100).toFixed(1)}% equalization rate`],
    ['County Taxable Value', fmt(parcel.countyTaxable), ''],
    ['Town Taxable Value', fmt(parcel.townTaxable), ''],
    ['School Taxable Value', fmt(parcel.schoolTaxable), ''],
  ];

  for (const [label, value, note] of vals) {
    p1.drawText(label + ':', { x: 30, y, size: 9, font: regular, color: GRAY });
    p1.drawText(value, { x: 220, y, size: 9, font: bold, color: BLACK });
    if (note) p1.drawText(note, { x: 340, y, size: 8, font: regular, color: GRAY });
    y -= 16;
  }

  y -= 14;

  // Analysis box
  const boxColor = analysis.hasCase ? rgb(1, 0.93, 0.93) : analysis.borderline ? rgb(1, 0.97, 0.87) : rgb(0.9, 1, 0.92);
  const boxBorder = analysis.hasCase ? RED : analysis.borderline ? rgb(0.85, 0.6, 0) : rgb(0.1, 0.6, 0.2);
  const boxHeight = 90;

  p1.drawRectangle({ x: 30, y: y - boxHeight, width: width - 60, height: boxHeight, color: boxColor });
  p1.drawRectangle({ x: 30, y: y - boxHeight, width: 4, height: boxHeight, color: boxBorder });

  const verdict = analysis.hasCase
    ? 'LIKELY OVER-ASSESSED — STRONG GROUNDS FOR GRIEVANCE'
    : analysis.borderline
    ? 'BORDERLINE — CONSIDER FILING WITH SUPPORTING APPRAISAL'
    : 'ASSESSMENT APPEARS FAIR';

  p1.drawText(verdict, { x: 42, y: y - 16, size: 10, font: bold, color: boxBorder });

  const analysisLines = [
    `Your Assessment Ratio: ${pct(analysis.subjectRatio)}   |   Median Comp Ratio: ${pct(analysis.medianCompRatio)}   |   Difference: ${analysis.overassessmentPct > 0 ? '+' : ''}${analysis.overassessmentPct.toFixed(1)}%`,
  ];
  if (analysis.hasCase) {
    analysisLines.push(`${analysis.underassessedComps.length} of ${comps.length} comparable properties are assessed at a lower ratio than yours.`);
    if (analysis.potentialSavings > 0) {
      analysisLines.push(`Estimated annual tax savings if assessment is corrected: ~${fmt(analysis.potentialSavings)}`);
    }
  }
  analysisLines.push('Basis for complaint: Unequal Assessment (NY Real Property Tax Law § 305)');

  let ay = y - 32;
  for (const line of analysisLines) {
    p1.drawText(line, { x: 42, y: ay, size: 8.5, font: regular, color: BLACK });
    ay -= 13;
  }

  y -= boxHeight + 18;

  // Grievance instructions
  drawSectionHeader(p1, bold, 'GRIEVANCE FILING REFERENCE', 30, y, width - 60);
  y -= 18;

  const steps = [
    'Complete Form RP-524 (Complaint on Real Property Assessment) — see Page 2 for pre-fill data',
    'Attach this Evidence Package (Pages 2–3) showing comparable properties with lower assessment ratios',
    'Submit to your local Board of Assessment Review (BAR) by Grievance Day (4th Tuesday of May)',
    'If denied: file for Small Claims Assessment Review (SCAR) — ~$30 filing fee, no attorney required',
  ];

  for (let i = 0; i < steps.length; i++) {
    p1.drawCircle({ x: 36, y: y + 3, size: 7, color: BLUE });
    p1.drawText(`${i + 1}`, { x: i < 9 ? 33.5 : 32, y: y - 1, size: 7, font: bold, color: WHITE });
    wrapText(p1, regular, steps[i], 50, y, width - 80, 8.5, BLACK, 13);
    y -= 26;
  }

  y -= 10;

  // Footer
  drawFooter(p1, regular, width, 'Page 1 of 3 — Property Summary & Analysis');

  // ─── PAGE 2: RP-524 Reference ──────────────────────────────────────────────
  const p2 = doc.addPage([612, 792]);
  y = height - 40;

  p2.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: BLUE });
  p2.drawText('FORM RP-524 PRE-FILL DATA', {
    x: 30, y: height - 35, size: 14, font: bold, color: WHITE,
  });
  p2.drawText('Copy these values into your RP-524 Complaint on Real Property Assessment form', {
    x: 30, y: height - 55, size: 9, font: regular, color: rgb(0.8, 0.85, 1),
  });

  y = height - 90;

  // Section 1 of RP-524
  drawSectionHeader(p2, bold, 'RP-524 SECTION 1 — Description of Property', 30, y, width - 60);
  y -= 18;

  const rp524Fields = [
    ['1a. Location of Property (street/road)', parcel.address],
    ['1b. Municipality', parcel.municipality],
    ['1c. County', parcel.county],
    ['1d. School district', parcel.schoolDistrict || ''],
    ['1e. Tax map number / Section-Block-Lot', parcel.printKey],
    ['1f. Property classification code', parcel.propertyClass],
    ['1g. Description of property', parcel.propertyClassDesc],
    ['2. Current total assessed value', fmt(parcel.assessmentTotal)],
    ['3a. Applicant\'s estimate of full market value', '← Enter your estimate here'],
    ['3b. Basis for estimate', 'Comparable sales analysis — see attached evidence'],
    ['4. Name of owner of record', parcel.ownerName || ''],
    ['5. Mailing address of owner', '← Enter your mailing address'],
  ];

  for (const [label, value] of rp524Fields) {
    const isPlaceholder = value.startsWith('←');
    p2.drawText(label + ':', { x: 30, y, size: 8.5, font: regular, color: GRAY });
    p2.drawText(value, { x: 270, y, size: 8.5, font: isPlaceholder ? regular : bold, color: isPlaceholder ? rgb(0.6, 0.3, 0) : BLACK });
    p2.drawLine({ start: { x: 270, y: y - 1 }, end: { x: width - 30, y: y - 1 }, thickness: 0.3, color: rgb(0.85, 0.85, 0.85) });
    y -= 17;
  }

  y -= 10;

  drawSectionHeader(p2, bold, 'RP-524 SECTION 2 — Grounds for Complaint', 30, y, width - 60);
  y -= 18;

  p2.drawText('Check the applicable box on your RP-524:', { x: 30, y, size: 9, font: regular, color: BLACK });
  y -= 16;

  const grounds = [
    ['☑ UNEQUAL ASSESSMENT (most common for residential)', `Your assessment ratio (${pct(analysis.subjectRatio)}) is higher than the median ratio of comparable properties (${pct(analysis.medianCompRatio)}). NY RPTL § 305.`],
    ['☐ EXCESSIVE ASSESSMENT (if you have an appraisal)', 'Use if an independent appraisal shows property is worth less than assessor\'s market value estimate.'],
    ['☐ UNLAWFUL ASSESSMENT', 'Use if property is exempt from taxation (rare for residential).'],
  ];

  for (const [label, desc] of grounds) {
    p2.drawText(label, { x: 30, y, size: 9, font: bold, color: BLACK });
    y -= 13;
    wrapText(p2, regular, desc, 40, y, width - 70, 8.5, GRAY, 12);
    y -= 26;
  }

  y -= 8;

  // Key legal citation
  p2.drawRectangle({ x: 30, y: y - 50, width: width - 60, height: 50, color: rgb(0.94, 0.97, 1) });
  p2.drawText('Key Legal Standard — NY Real Property Tax Law § 305:', { x: 38, y: y - 14, size: 9, font: bold, color: BLUE });
  wrapText(p2, regular,
    '"The assessment of each parcel of real property shall not exceed its full value, and the ratio of assessed value to full value shall be uniform throughout each assessing unit."',
    38, y - 26, width - 76, 8.5, BLACK, 12);

  drawFooter(p2, regular, width, 'Page 2 of 3 — RP-524 Reference Data');

  // ─── PAGE 3: Comps Table ──────────────────────────────────────────────────
  const p3 = doc.addPage([612, 792]);
  y = height - 40;

  p3.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: BLUE });
  p3.drawText('COMPARABLE PROPERTIES — ASSESSMENT RATIO ANALYSIS', {
    x: 30, y: height - 35, size: 13, font: bold, color: WHITE,
  });
  p3.drawText(`${comps.length} comparable properties in ${parcel.municipality} — same property class, similar market value`, {
    x: 30, y: height - 55, size: 9, font: regular, color: rgb(0.8, 0.85, 1),
  });

  y = height - 90;

  // Table header
  const cols = [
    { label: 'Address', x: 30, w: 195 },
    { label: 'Assessment', x: 228, w: 80 },
    { label: 'Market Value', x: 312, w: 80 },
    { label: 'Assess. Ratio', x: 396, w: 75 },
    { label: 'vs. Yours', x: 474, w: 65 },
    { label: 'Flag', x: 542, w: 40 },
  ];

  // Header row
  p3.drawRectangle({ x: 30, y: y - 16, width: width - 60, height: 16, color: BLUE });
  for (const col of cols) {
    p3.drawText(col.label, { x: col.x + 3, y: y - 12, size: 7.5, font: bold, color: WHITE });
  }
  y -= 16;

  // Subject row
  p3.drawRectangle({ x: 30, y: y - 15, width: width - 60, height: 15, color: rgb(0.87, 0.92, 1) });
  const subjectRatio = analysis.subjectRatio;
  const subjectData = [
    parcel.address.substring(0, 30) + (parcel.address.length > 30 ? '…' : ''),
    fmt(parcel.assessmentTotal),
    fmt(parcel.fullMarketValue),
    pct(subjectRatio),
    '—',
    'YOUR HOME',
  ];
  cols.forEach((col, i) => {
    p3.drawText(subjectData[i], { x: col.x + 3, y: y - 11, size: 7, font: bold, color: BLUE });
  });
  y -= 15;

  // Comp rows
  const visibleComps = analysis.compRatios.slice(0, 35);
  for (let i = 0; i < visibleComps.length; i++) {
    const comp = visibleComps[i];
    const flagged = comp.assessmentRatio < subjectRatio * 0.95;
    const diff = ((subjectRatio - comp.assessmentRatio) / subjectRatio) * 100;
    const rowColor = flagged ? rgb(1, 0.93, 0.93) : i % 2 === 0 ? WHITE : LIGHT_GRAY;

    p3.drawRectangle({ x: 30, y: y - 14, width: width - 60, height: 14, color: rowColor });

    const addr = (comp.address || '').substring(0, 28) + ((comp.address || '').length > 28 ? '…' : '');
    const rowData = [
      addr,
      fmt(comp.assessmentTotal),
      fmt(comp.fullMarketValue),
      pct(comp.assessmentRatio),
      flagged ? `-${diff.toFixed(1)}%` : diff < 0 ? `+${Math.abs(diff).toFixed(1)}%` : 'similar',
      flagged ? '★ LOWER' : '',
    ];

    cols.forEach((col, ci) => {
      const isFlag = ci === 5 && flagged;
      p3.drawText(rowData[ci], {
        x: col.x + 3,
        y: y - 10,
        size: 7,
        font: isFlag || (ci === 4 && flagged) ? bold : regular,
        color: flagged ? RED : BLACK,
      });
    });

    y -= 14;
    if (y < 60) break;
  }

  // Summary line
  y -= 8;
  const flaggedCount = analysis.underassessedComps.length;
  p3.drawRectangle({ x: 30, y: y - 30, width: width - 60, height: 30, color: flaggedCount > 0 ? rgb(1, 0.93, 0.93) : LIGHT_GRAY });
  p3.drawText(
    flaggedCount > 0
      ? `★ ${flaggedCount} of ${visibleComps.length} comparable properties are assessed at a lower ratio than your property.`
      : `No significant over-assessment detected among ${visibleComps.length} comparable properties.`,
    { x: 38, y: y - 12, size: 9, font: bold, color: flaggedCount > 0 ? RED : GRAY }
  );
  p3.drawText(
    'Assessment Ratio = Total Assessment ÷ Full Market Value. Lower ratio = less tax per dollar of value.',
    { x: 38, y: y - 24, size: 7.5, font: regular, color: GRAY }
  );

  drawFooter(p3, regular, width, 'Page 3 of 3 — Comparable Properties Evidence');

  const bytes = await doc.save();
  return bytes;
}

function drawSectionHeader(page, font, text, x, y, w) {
  page.drawRectangle({ x, y: y - 14, width: w, height: 14, color: rgb(0.93, 0.96, 1) });
  page.drawText(text, { x: x + 6, y: y - 10, size: 8.5, font, color: BLUE });
}

function drawFieldRow(page, regular, bold, label, value, x, y, w) {
  page.drawText(label + ':', { x, y, size: 8.5, font: regular, color: GRAY });
  page.drawText(value, { x: x + 160, y, size: 8.5, font: bold, color: BLACK });
}

function wrapText(page, font, text, x, y, maxWidth, size, color, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    const w = font.widthOfTextAtSize(test, size);
    if (w > maxWidth && line) {
      page.drawText(line, { x, y: cy, size, font, color });
      cy -= lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) page.drawText(line, { x, y: cy, size, font, color });
}

function drawFooter(page, font, width, text) {
  page.drawLine({ start: { x: 30, y: 30 }, end: { x: width - 30, y: 30 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  page.drawText(text, { x: 30, y: 18, size: 7.5, font, color: GRAY });
  page.drawText('data.ny.gov — NYS ORPTS Assessment Roll', { x: width - 200, y: 18, size: 7.5, font, color: GRAY });
}
