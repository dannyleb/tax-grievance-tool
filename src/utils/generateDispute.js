import Anthropic from '@anthropic-ai/sdk';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

function fmt(n) {
  return n ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}

function pct(n) {
  return n != null ? `${(n * 100).toFixed(1)}%` : 'N/A';
}

/**
 * Build the prompt from parcel data, comps, analysis, and tax info.
 */
function buildPrompt({ parcel, municipality, analysis, subjectTax, comps }) {
  const flaggedComps = analysis.underassessedComps.slice(0, 8);
  const subjectRatio = analysis.subjectRatio;

  const compLines = flaggedComps.map((c, i) =>
    `  ${i + 1}. ${c.address || 'Address on file'} — Assessment: ${fmt(c.assessmentTotal)}, ` +
    `Market Value: ${fmt(c.fullMarketValue)}, Ratio: ${pct(c.assessmentRatio)}`
  ).join('\n');

  // Only include comps assessed at a lower ratio — these are the evidence for unequal assessment.
  // Never expose comps assessed at a higher rate; that would undermine the homeowner's case.
  const lowerRatioComps = (analysis.compRatios || [])
    .filter(c => c.assessmentRatio < subjectRatio)
    .slice(0, 15);

  const allCompLines = lowerRatioComps.map((c, i) =>
    `  ${i + 1}. ${c.address || 'Address on file'} — Assessed: ${fmt(c.assessmentTotal)}, ` +
    `FMV: ${fmt(c.fullMarketValue)}, Ratio: ${pct(c.assessmentRatio)}`
  ).join('\n');

  const taxBlock = subjectTax
    ? `Estimated Prior-Year Tax Bill (FY${subjectTax.fiscalYear}):
  County (${subjectTax.countyRate}/1k):   ${fmt(subjectTax.countyTax)}
  Town   (${subjectTax.municipalRate}/1k):   ${fmt(subjectTax.municipalTax)}
  School (${subjectTax.schoolRate.toFixed(2)}/1k, ${subjectTax.schoolName}): ${fmt(subjectTax.schoolTax)}
  TOTAL:  ${fmt(subjectTax.totalTax)}`
    : 'Tax rate data unavailable.';

  const potentialSavings = analysis.potentialSavings > 0
    ? `Estimated annual savings if corrected to median ratio: ${fmt(analysis.potentialSavings)}`
    : '';

  return `You are a New York State property tax attorney helping a homeowner prepare a written grievance statement for their Board of Assessment Review (BAR) hearing in ${municipality.name}, ${municipality.county || ''} County.

Generate a professional, persuasive written statement (4–5 paragraphs) the homeowner can submit with Form RP-524 or present at the hearing. The statement must:
- Be formal but clear and direct — no legal jargon without explanation
- Lead with the property address and owner name
- State the legal basis (unequal assessment under NY Real Property Tax Law §305)
- Present the comparable evidence concisely with the most compelling numbers
- Close with a specific request for the reduced assessed value (target: reduce ratio to match median comp)
- NOT include placeholder brackets — use the actual data provided

Do not add a salutation line. Start directly with "Re:" or "Subject:" then the property address.

=== PROPERTY DATA ===
Owner: ${parcel.ownerName || 'Property Owner'}
Property Address: ${parcel.address}
Municipality: ${parcel.municipality}, ${parcel.county} County, New York
School District: ${parcel.schoolDistrictName || parcel.schoolDistrict}
Parcel / Tax Map ID: ${parcel.printKey}
Property Class: ${parcel.propertyClass} — ${parcel.propertyClassDesc}
Assessment Roll Year: ${parcel.rollYear}

=== ASSESSMENT VALUES ===
Current Total Assessment: ${fmt(parcel.assessmentTotal)}
Assessor's Full Market Value: ${fmt(parcel.fullMarketValue)}
Subject Assessment Ratio: ${pct(subjectRatio)} (assessed ÷ market value)
Median Comparable Ratio: ${pct(analysis.medianCompRatio)}
Over-Assessment vs. Median: +${analysis.overassessmentPct.toFixed(1)}%
${potentialSavings}

=== TAX DATA ===
${taxBlock}

=== COMPARABLE PROPERTIES WITH LOWER ASSESSMENT RATIOS (key evidence) ===
${flaggedComps.length > 0 ? compLines : '  No flagged comps — borderline case, use all comps below'}

=== ADDITIONAL COMPARABLES WITH LOWER ASSESSMENT RATIOS (same class, same municipality, ±25% market value) ===
${allCompLines || '  (All comparables listed above as key evidence)'}

=== NY LAW BASIS ===
Real Property Tax Law §305: "The assessment of each parcel of real property shall not exceed its full value, and the ratio of assessed value to full value shall be uniform throughout each assessing unit."
A property is unequally assessed if its ratio of assessed value to full value exceeds the median ratio of comparable properties.

=== REQUESTED OUTCOME ===
Reduce the assessed value so the assessment ratio matches the median ratio of comparable properties: ${pct(analysis.medianCompRatio)} × ${fmt(parcel.fullMarketValue)} = ${fmt(parcel.fullMarketValue * analysis.medianCompRatio)}.

=== FORMAL GRIEVANCE PROCESS NOTE ===
This statement will be submitted to the Board of Assessment Review (BAR) which consists of 3–5 town residents appointed by the Town Board. The assessor attends and has the right to respond. The homeowner has the right to appear personally with or without an attorney.`;
}

/**
 * Stream an AI-generated grievance dispute statement.
 * Calls onChunk(text) for each streamed token, onDone() when complete.
 * Throws if API key is missing or API call fails.
 */
export async function generateDisputeStatement({ parcel, municipality, analysis, subjectTax, comps, onChunk, onDone }) {
  if (!API_KEY) {
    throw new Error('NO_API_KEY');
  }

  if (!analysis.hasCase && !analysis.borderline) {
    throw new Error('NO_CASE');
  }

  const client = new Anthropic({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const prompt = buildPrompt({ parcel, municipality, analysis, subjectTax, comps });

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta?.type === 'text_delta'
    ) {
      onChunk(event.delta.text);
    }
  }

  onDone();
}

export const hasApiKey = () => Boolean(API_KEY);
