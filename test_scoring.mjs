// Unit-tests the Score vs Profile node for this fork's architect profile. No network.
//   node test_scoring.mjs
import fs from 'node:fs';
const wf = JSON.parse(fs.readFileSync(new URL('./jobs-radar.workflow.json', import.meta.url),'utf8'));
const src = wf.nodes.find(n=>n.name==='Score vs Profile').parameters.jsCode;
const score = (items) => new Function('$input','$','$getWorkflowStaticData',src)({all:()=>items});

const post = (o) => ({json:{source:'greenhouse', company:'x', location:'Spain (Remote)', description:'', postedAt:null, ...o}});
const one = (o) => { const r = score([post(o)]); return r.length ? r[0].json : null; };
let fail = 0;
const check = (name, cond, extra='') => { console.log((cond?'PASS  ':'FAIL  ')+name+(cond?'':'  <- '+extra)); if(!cond) fail++; };

const TITLE = 'Senior Solution Architect';

// Wrong-track titles must never enter the shortlist.
check('PM titles are dropped', one({title:'Senior Product Manager', description:'Own the roadmap.'}) === null);
check('engineer titles without architect are dropped',
  one({title:'Senior Software Engineer', location:'Madrid', description:'Build backend services in Python.'}) === null);
check('Staff Software Engineer is not opened by the staff overlay',
  one({title:'Staff Software Engineer', location:'Madrid', description:'Lead the backend team.'}) === null);
check('Salesforce Architect is blocked as the wrong architect track',
  one({title:'Salesforce Architect', location:'Madrid', description:'Design Salesforce solutions.'}) === null);

const em = one({title:'Engineering Manager', description:'Lead a cross-functional engineering team, Kanban delivery and mentoring.'});
check('Engineering Manager titles score', !!em && em.score > 0, String(em && em.score));
check('Engineering Manager title is named', em && em.reasons.includes('engineering manager in title'), em && em.reasons.join(' · '));
check('Head of Engineering is dropped as too senior for the EM track',
  one({title:'Head of Engineering', description:'Lead the engineering organisation.'}) === null);
check('Director of Engineering is dropped as too senior for the EM track',
  one({title:'Director of Engineering', description:'Set engineering strategy for the org.'}) === null);
check('VP of Engineering is dropped as too senior for the EM track',
  one({title:'VP of Engineering', description:'Own the engineering organisation.'}) === null);
check('Head of Architecture is dropped as too senior for the SA band',
  one({title:'Head of Architecture', description:'Own the architecture organisation.'}) === null);
check('Director of Architecture is dropped as too senior for the SA band',
  one({title:'Director of Architecture', description:'Set architecture strategy for the org.'}) === null);
check('Chief Architect is dropped as too senior for the SA band',
  one({title:'Chief Architect', description:'Own technical architecture for the company.'}) === null);
check('Principal Architect is dropped as too senior for the SA band',
  one({title:'Principal Architect', description:'Set architecture direction across teams.'}) === null);
check('Staff Architect is dropped as too senior for the SA band',
  one({title:'Staff Architect', description:'Lead architecture for a product area.'}) === null);

const tl = one({title:'Technical Lead', description:'Own system design and integration architecture for the platform.'});
check('Technical Lead titles score', !!tl && tl.score > 0, String(tl && tl.score));

const staffEm = one({title:'Staff Engineering Manager', description:'Lead delivery for a 10-person engineering team.'});
check('Staff Engineering Manager is scored as lead',
  staffEm && staffEm.reasons.includes('lead title'), staffEm && staffEm.reasons.join(' · '));

const sa = one({title:'Solution Architect', description:'Own the architecture.'});
const seniorSa = one({title:'Senior Solution Architect', description:'Own the architecture.'});
check('seniority does not change the title-match points',
  sa && seniorSa && sa.score === seniorSa.score,
  `${sa && sa.score} vs ${seniorSa && seniorSa.score}`);
check('plain SA is labelled target title', sa && sa.reasons.includes('target title'), sa && sa.reasons.join(' · '));
check('senior SA is labelled senior title',
  seniorSa && seniorSa.reasons.includes('senior title'), seniorSa && seniorSa.reasons.join(' · '));

const berlinEmpty = one({title:'Solution Architect', location:'Berlin', description:''});
check('empty-description SA in Berlin scores 44 and clears the threshold',
  berlinEmpty && berlinEmpty.score === 44,
  String(berlinEmpty && berlinEmpty.score));

const emMadrid = one({title:'Engineering Manager', location:'Madrid',
  description:'Lead a cross-functional engineering team, Kanban delivery and mentoring.'});
const seniorEm = one({title:'Senior Engineering Manager', location:'Madrid',
  description:'Lead a cross-functional engineering team, Kanban delivery and mentoring.'});
check('Senior EM is penalised relative to EM',
  seniorEm && emMadrid && seniorEm.reasons.includes('-senior EM') && seniorEm.score < emMadrid.score,
  `${seniorEm && seniorEm.score} vs ${emMadrid && emMadrid.score} — ${seniorEm && seniorEm.reasons.join(' · ')}`);

// Baseline: a generic senior solution architect role in Spain, no scarce signal.
const base = one({title:TITLE, description:'You will own the architecture for our B2B SaaS product.'});
console.log(`baseline generic Senior Solution Architect in Spain: ${base.score}`);
check('baseline architect role scores', !!base && base.score > 0, String(base && base.score));

const aiSol = one({title:'AI Solutions Architect',
  description:'Design multi-step agent workflows and retrieval over documentation and code, with OpenAPI contracts as the source of truth.'});
check('AI Solutions Architect outranks generic solution architect',
  aiSol.score > base.score, `${aiSol.score} vs ${base.score}`);

// 1. An OpenAPI / API-contract JD must clearly outrank the generic one.
const apiJd = one({title:TITLE,
  description:'You will own API governance and OpenAPI contracts as the source of truth, with Postman collections generated from Swagger and contract-first design reviews.'});
check('API-contract JD outranks generic', apiJd.score > base.score + 8, `${apiJd.score} vs ${base.score}`);
check('API contract reasons are named', apiJd.reasons.some(r=>/API contract practice/.test(r)), apiJd.reasons.join(' · '));

// 2. It must be able to clear the threshold on that signal even without an AI title.
check('API-contract role clears the 30 threshold', apiJd.score >= 30, String(apiJd.score));

// 3. GDPR/HIPAA boilerplate must NOT inflate anything.
const boiler = one({title:TITLE,
  description:'You will own the architecture for our B2B SaaS product. We process your application data in accordance with GDPR. HIPAA compliance training provided.'});
check('GDPR/HIPAA boilerplate does not inflate the score', boiler.score === base.score, `${boiler.score} vs ${base.score}`);

// 4. Platform in the TITLE is worth more than platform only in the description.
const titlePlatform = one({title:'Senior Platform Architect', description:'Own the architecture.'});
const descPlatform  = one({title:TITLE, description:'Own the architecture for our platform services and platform team.'});
check('platform in title scores above platform only in description',
  titlePlatform.score > descPlatform.score, `${titlePlatform.score} vs ${descPlatform.score}`);

// 5. High-load / campaign-platform signal is picked up.
const load = one({title:TITLE, description:'Our campaign management platform processes tens of millions of messages per day for a 10M+ customer base.'});
check('high-load / campaign signal scores',
  load.score > base.score && load.reasons.some(r=>/high-load|campaign\/martech/.test(r)),
  `${load.score} — ${load.reasons.join(' · ')}`);

// 6. The scarce bucket is capped -- it must not saturate the whole score.
const everything = one({title:'Senior Platform Architect, API',
  description:'OpenAPI, Swagger, API contract, contract-first, API governance, Postman collections, campaign management, martech platform, customer data platform, CDP, personalization engine, high-load, high-throughput, tens of millions, 10M+, million events, integration architecture, enterprise integration, event-driven architecture.'});
check('scarce bucket is capped, not saturating', everything.score <= 100 && everything.score - base.score <= 24 + 12 + 8 + 6,
  `delta ${everything.score - base.score}`);

// 7. A Python/FastAPI JD still scores on the keyword bucket.
const py = one({title:TITLE, description:'Hands-on Python and FastAPI backend work alongside architecture.'});
check('Python/FastAPI keyword still scores',
  py.reasons.includes('Python/FastAPI') && py.score > base.score, `${py.score} — ${py.reasons.join(' · ')}`);

// 8. The health boost must not promote roles needing a clinical credential.
const clinician = one({title:'Senior Clinical Architect',
  description:'You will shape our clinical architecture. We are looking for a medical degree and meaningful experience practising medicine, with a strong understanding of clinicians day-to-day work.'});
const apiHealth = one({title:'AI Senior Solution Architect',
  description:'Design AI-native API platforms with LLM-powered interfaces. OpenAPI contracts, Python, FastAPI.'});
check('clinician-credential role is penalised', clinician.reasons.includes('-clinical credential required'), clinician.reasons.join(' · '));
check('a reachable AI architect role outranks the clinician-only one',
  apiHealth.score > clinician.score, `${apiHealth.score} vs ${clinician.score}`);

// ---------------------------------------------------------------- geography

// 9. Bare US city names must trigger the US-only penalty.
for (const city of ['San Francisco', 'New York', 'New York City', 'Seattle', 'Austin',
                    'Chicago', 'Palo Alto', 'Denver', 'San Francisco Office',
                    'Hybrid - San Francisco, New York City']) {
  const r = one({title:TITLE, location: city, description:'Own the architecture.'});
  check(`US-only penalty fires on bare "${city}"`, r.reasons.includes('-US-only'), r.reasons.join(' · '));
}

// 10. EU cities whose COUNTRY was already listed must now score as EU locations.
for (const city of ['Munich', 'München', 'Mannheim, Baden-Württemberg', 'Stockholm',
                    'Warsaw', 'Milan', 'Frankfurt', 'Belgrade', 'Prague, Czechia',
                    'København, DK', 'Zurich']) {
  const r = one({title:TITLE, location: city, description:'Own the architecture.'});
  check(`EU location bonus fires on "${city}"`,
    r.reasons.includes('EU location') && !r.reasons.includes('-US-only'), r.reasons.join(' · '));
}

// 11. An EU city must never be read as a US state code.
const mannheimDE = one({title:TITLE, location:'Mannheim, DE', description:'Own the architecture.'});
check('an EU city with a country code colliding with a US state is not US-only',
  !mannheimDE.reasons.includes('-US-only'), mannheimDE.reasons.join(' · '));

// 12. "worldwide" in a company blurb must NOT buy the worldwide bonus.
const blurb = one({title:TITLE, location:'Munich',
  description:'We unite around one mission: enabling sustainable growth for businesses worldwide. Own the architecture.'});
check('a "worldwide" company blurb does not buy the worldwide bonus',
  !blurb.reasons.some(r=>/^worldwide/.test(r)), blurb.reasons.join(' · '));
check('...and that posting still scores as an EU location',
  blurb.reasons.includes('EU location'), blurb.reasons.join(' · '));

// 13. A genuine location-free statement still earns it, from either field.
const anywhereLoc = one({title:TITLE, location:'Anywhere', description:'Own the architecture.'});
const anywhereDesc = one({title:TITLE, location:'Remote',
  description:'This role is fully remote and you can work from anywhere in the world.'});
check('worldwide bonus still fires from the location field', anywhereLoc.reasons.some(r=>/^worldwide/.test(r)), anywhereLoc.reasons.join(' · '));
check('worldwide bonus still fires on an explicit work-from-anywhere phrase',
  anywhereDesc.reasons.some(r=>/^worldwide/.test(r)), anywhereDesc.reasons.join(' · '));

// 14. The EU-remote bonus must need an eligibility phrase, not a passing mention.
const nonEu = one({title:TITLE, location:'Bengaluru',
  description:'We are building a new architecture team in India. You will work with our teams based in Europe and North America.'});
check('a passing "based in Europe" does not buy the EU-remote bonus',
  !nonEu.reasons.includes('remote EU/EMEA'), nonEu.reasons.join(' · '));
const euRemote = one({title:TITLE, location:'Remote',
  description:'This is a remote role within Europe; candidates must be based in Europe.'});
check('an explicit remote-within-Europe phrase still earns the EU-remote bonus',
  euRemote.reasons.includes('remote EU/EMEA'), euRemote.reasons.join(' · '));

// 15. Spain still outranks a generic EU city — including Salou.
const madrid = one({title:TITLE, location:'Madrid', description:'Own the architecture.'});
const munich = one({title:TITLE, location:'Munich', description:'Own the architecture.'});
const salou = one({title:TITLE, location:'Salou', description:'Own the architecture.'});
check('a Spain location still outranks a generic EU city',
  madrid.score > munich.score, `${madrid.score} vs ${munich.score}`);
check('Salou is Spain-eligible',
  salou.reasons.includes('Spain-eligible'), salou.reasons.join(' · '));

// ------------------------------------------------- working method + history

// 16. The working-method block must score.
const plain = one({title:TITLE, location:'Madrid',
  description:'Own the architecture for our B2B SaaS product.'});
const method = one({title:TITLE, location:'Madrid',
  description:'Own the architecture for our B2B SaaS product. We are an AI-native team: daily use of AI tools is expected, we work spec-driven, and you should have shipped something you can demo. Familiarity with Claude Code and Cursor.'});
check('a working-method JD outranks an otherwise identical one',
  method.score > plain.score + 15, `${method.score} vs ${plain.score}`);
check('the working-method reasons are named',
  method.reasons.some(r=>/daily AI tooling/.test(r)) && method.reasons.some(r=>/AI-native team/.test(r)),
  method.reasons.join(' · '));

// 17. It is capped.
const everyMethod = one({title:TITLE, location:'Madrid',
  description:'Own the architecture for our B2B SaaS product. AI-native, AI-first, daily use of AI tooling, spec-driven, OpenSpec, prototype it yourself, shipped something, show us not tell us. Claude Code, Cursor, Copilot, Windsurf, Replit.'});
const wmRaw = 10 + 8 + 8 + 7 + 7;
check('the working-method bucket is capped at 22',
  everyMethod.score - plain.score <= 22 && wmRaw > 22,
  `delta ${everyMethod.score - plain.score}, uncapped would be ${wmRaw}`);

// 18. And it must NEVER rescue a posting that failed the location gate.
const usMethod = one({title:TITLE, location:'San Francisco',
  description:'We are an AI-native team, daily use of AI tools, spec-driven, Claude Code and Cursor, shipped something you can demo.'});
check('working-method does not fire on a US-only posting',
  !usMethod.reasons.some(r=>/daily AI tooling/.test(r)), usMethod.reasons.join(' · '));
const nonEuMethod = one({title:TITLE, location:'Bengaluru',
  description:'We are an AI-native team, daily use of AI tools, spec-driven, Claude Code and Cursor, shipped something you can demo.'});
check('working-method does not fire where no positive geography reason exists',
  !nonEuMethod.reasons.some(r=>/daily AI tooling/.test(r)), nonEuMethod.reasons.join(' · '));

const usRemote = one({title:TITLE, location:'San Francisco (Remote)', description:'Own the architecture.'});
check('US remote is a mild penalty, not a hard US-only drop',
  usRemote.reasons.includes('-US-remote') && !usRemote.reasons.includes('-US-only'),
  usRemote.reasons.join(' · '));

// 19. Application history is annotated, and it stays OUT of `reasons`.
const known = one({company:'example-company', title:TITLE, location:'Madrid', description:'Own the architecture.'});
const closed = one({company:'a-company-you-have-stopped-applying-to', title:TITLE, location:'Madrid', description:'Own the architecture.'});
const unknown = one({company:'somebrandnewco', title:TITLE, location:'Madrid', description:'Own the architecture.'});
check('a company already applied to is tagged applied', known.history === 'applied', String(known.history));
check('a closed door is tagged closed', closed.history === 'closed', String(closed.history));
check('an unknown company is not tagged', unknown.history === null, String(unknown.history));
check('history never leaks into reasons',
  !known.reasons.join(' ').match(/applied|closed/), known.reasons.join(' · '));
check('history does not change the score',
  known.score === unknown.score, `${known.score} vs ${unknown.score}`);

// ---------------------------------------------------------------- UK is not EU

const london = one({title:TITLE, location:'London', description:'Own the architecture.'});
check('London is not an EU location',
  !london.reasons.includes('EU location') && !london.reasons.includes('remote EU/EMEA'),
  london.reasons.join(' · '));
check('UK without sponsorship is penalised',
  london.reasons.includes('-UK, no sponsorship'), london.reasons.join(' · '));

const londonSponsor = one({title:TITLE, location:'London, United Kingdom',
  description:'Own the architecture. Visa sponsorship is available for this role.'});
check('UK with visa sponsorship is not penalised',
  !londonSponsor.reasons.includes('-UK, no sponsorship'), londonSponsor.reasons.join(' · '));
check('UK still does not earn the EU bonus even with sponsorship',
  !londonSponsor.reasons.includes('EU location'), londonSponsor.reasons.join(' · '));

const ukRemote = one({title:TITLE, location:'Remote within the UK',
  description:'This role is remote within the UK.'});
check('Remote-UK without sponsorship is penalised and is not EU-remote',
  ukRemote.reasons.includes('-UK, no sponsorship') && !ukRemote.reasons.includes('remote EU/EMEA'),
  ukRemote.reasons.join(' · '));

const londonBerlin = one({title:TITLE, location:'London or Berlin', description:'Own the architecture.'});
check('London or Berlin is not UK-penalised because an EU option exists',
  !londonBerlin.reasons.includes('-UK, no sponsorship') && londonBerlin.reasons.includes('EU location'),
  londonBerlin.reasons.join(' · '));

const dublin = one({title:TITLE, location:'Dublin', description:'Own the architecture.'});
check('Ireland stays in the EU list',
  dublin.reasons.includes('EU location') && !dublin.reasons.includes('-UK, no sponsorship'),
  dublin.reasons.join(' · '));

// ---------------------------------------------------------- customer-facing

const internal = one({title:TITLE, location:'Madrid',
  description:'Own the architecture for our B2B SaaS product.'});
check('an internal architecture JD is not tagged customer-facing',
  !internal.reasons.includes('-customer-facing'), internal.reasons.join(' · '));

const presales = one({title:TITLE, location:'Madrid',
  description:'Own the architecture for our B2B SaaS product. Partner with account executives as the primary technical advisor to enterprise customers. Pre-sales.'});
check('pre-sales is penalised as customer-facing',
  presales.reasons.includes('-customer-facing') && presales.score === internal.score - 30,
  `${presales.score} vs ${internal.score} — ${presales.reasons.join(' · ')}`);
check('pre-sales falls below the threshold',
  presales.score < 40, String(presales.score));

const postsales = one({title:TITLE, location:'Madrid',
  description:'Own the architecture for our B2B SaaS product. Post-sales implementation: scope and design end-to-end deployments at the customer.'});
check('post-sales is penalised the same way, not labelled only',
  postsales.reasons.includes('-customer-facing') && postsales.score === internal.score - 30,
  `${postsales.score} vs ${internal.score} — ${postsales.reasons.join(' · ')}`);

for (const t of ['Applied AI Architect', 'Partner Architect', 'Implementation Architect', 'Forward Deployed Architect']) {
  const r = one({title:t, location:'Madrid', description:'Own the architecture for our B2B SaaS product.'});
  check(`"${t}" is penalised as customer-facing by title`,
    r && r.reasons.includes('-customer-facing') && r.score < 40,
    r ? `${r.score} — ${r.reasons.join(' · ')}` : 'dropped by title gate');
}

// ------------------------------------------------- licensed UK sponsors

const licensedLondon = one({title:TITLE, company:'Bloomberg', location:'London', description:'Own the architecture.'});
check('a licensed sponsor is not penalised for UK without a sponsorship sentence',
  licensedLondon && !licensedLondon.reasons.includes('-UK, no sponsorship')
    && licensedLondon.reasons.includes('UK, licensed sponsor'),
  licensedLondon && licensedLondon.reasons.join(' · '));
check('a licensed sponsor still earns no EU bonus in London',
  !licensedLondon.reasons.includes('EU location'), licensedLondon.reasons.join(' · '));
check('the exemption is worth exactly the 20 points',
  licensedLondon.score === london.score + 20, `${licensedLondon.score} vs ${london.score}`);

for (const c of ['Amazon', 'Google', 'Meta', 'flohealth', 'Flo Health', 'Bloomberg L.P.']) {
  const r = one({title:TITLE, company:c, location:'London, England', description:'Own the architecture.'});
  check(`"${c}" is recognised as a licensed sponsor`,
    r && !r.reasons.includes('-UK, no sponsorship'), r && r.reasons.join(' · '));
}
for (const c of ['Metabase', 'Flowable', 'x']) {
  const r = one({title:TITLE, company:c, location:'London', description:'Own the architecture.'});
  check(`"${c}" is not mistaken for a licensed sponsor`,
    r && r.reasons.includes('-UK, no sponsorship'), r && r.reasons.join(' · '));
}

const licensedNoSponsor = one({title:TITLE, company:'Amazon', location:'London',
  description:'Own the architecture. We are unable to offer visa sponsorship for this role.'});
check('a licensed sponsor that says it will not sponsor keeps the penalty',
  licensedNoSponsor && licensedNoSponsor.reasons.includes('-UK, no sponsorship'),
  licensedNoSponsor && licensedNoSponsor.reasons.join(' · '));

const licensedRtw = one({title:TITLE, company:'Amazon', location:'London',
  description:'Own the architecture. You must have the right to work in the UK.'});
check('a routine right-to-work line does not cancel the licensed-sponsor exemption',
  licensedRtw && !licensedRtw.reasons.includes('-UK, no sponsorship'),
  licensedRtw && licensedRtw.reasons.join(' · '));

// ------------------------------------------------------------------ TPM track

const TPM_JD = 'Drive cross-team technical programs: system design, integrations and dependency management.';
for (const t of ['Technical Program Manager', 'Senior Technical Program Manager', 'Sr. Technical Program Manager',
                 'Technical Programme Manager', 'Technical Program Manager III', 'Sr Technical Infrastructure Program Manager',
                 'Senior TPM', 'Technical Delivery Manager', 'Product Delivery Manager', 'Engineering Program Manager']) {
  const r = one({title:t, location:'Barcelona, Catalonia, ESP', description:TPM_JD});
  check(`"${t}" opens the gate and clears the threshold`,
    r && r.score >= 40, r ? `${r.score} — ${r.reasons.join(' · ')}` : 'dropped by title gate');
}
const tpm = one({title:'Technical Program Manager', location:'Madrid', description:TPM_JD});
check('TPM is named in the reasons', tpm && tpm.reasons.includes('TPM in title'), tpm && tpm.reasons.join(' · '));

for (const t of ['Principal Technical Program Manager', 'Staff Technical Program Manager',
                 'Director, Technical Program Management', 'Head of Program Management',
                 'Principal Technical Program Manager , World Wide Fulfillment Design & Engineering',
                 'Director of Delivery Management']) {
  check(`"${t}" is dropped as too senior for the TPM track`,
    one({title:t, location:'Barcelona', description:TPM_JD}) === null);
}
for (const t of ['Program Manager', 'Delivery Manager', 'Project Manager', 'Marketing Program Manager',
                 'Senior Technical Product Manager', 'Technical Product Manager']) {
  check(`"${t}" stays out`, one({title:t, location:'Madrid', description:TPM_JD}) === null);
}

const amazonTpmBcn = one({title:'Sr. Technical Program Manager, Procurement', company:'Amazon',
  location:'Barcelona, Catalonia, ESP', description:TPM_JD});
check('Amazon TPM in Barcelona is shortlisted with Spain named',
  amazonTpmBcn && amazonTpmBcn.score >= 40 && amazonTpmBcn.reasons.includes('Spain-eligible'),
  amazonTpmBcn && `${amazonTpmBcn.score} — ${amazonTpmBcn.reasons.join(' · ')}`);
const amazonTpmLon = one({title:'Sr Technical Infrastructure Program Manager, EMEA Data Center Delivery', company:'Amazon',
  location:'London, England, GBR', description:TPM_JD});
// London earns no location points (not EU, not remote), so a thin JD lands just under
// the threshold; the exemption's job is to not subtract 20 more, not to add a bonus.
check('Amazon TPM in London is UK-exempt and scores 20 above the same role at an unlisted company',
  amazonTpmLon && !amazonTpmLon.reasons.includes('-UK, no sponsorship'),
  amazonTpmLon && `${amazonTpmLon.score} — ${amazonTpmLon.reasons.join(' · ')}`);
const unlicensedTpmLon = one({title:'Sr Technical Infrastructure Program Manager, EMEA Data Center Delivery', company:'Acme',
  location:'London, England, GBR', description:TPM_JD});
check('the same TPM in London at an unlisted company keeps the UK penalty',
  unlicensedTpmLon && unlicensedTpmLon.reasons.includes('-UK, no sponsorship')
    && amazonTpmLon.score === unlicensedTpmLon.score + 20,
  unlicensedTpmLon && `${unlicensedTpmLon.score} vs ${amazonTpmLon.score}`);
const amazonTpmLonRich = one({title:'Sr Technical Infrastructure Program Manager, EMEA Data Center Delivery', company:'Amazon',
  location:'London, England, GBR',
  description:TPM_JD + ' Own API design and integration platform roadmaps across microservices and distributed systems; stakeholder requirements, technical documentation and system design reviews.'});
check('a keyword-rich Amazon TPM JD in London clears the threshold',
  amazonTpmLonRich && amazonTpmLonRich.score >= 40,
  amazonTpmLonRich && `${amazonTpmLonRich.score} — ${amazonTpmLonRich.reasons.join(' · ')}`);

check('an engineer title is not opened by the TIPM abbreviation',
  one({title:'Sr Mechanical Engineer, TIPM, Global Building Design & Engineering', company:'Amazon',
    location:'Madrid, Community of Madrid, ESP', description:TPM_JD}) === null);
const tpmIncidental = one({title:'Senior Technical Program Manager, EC2', company:'Amazon', location:'Berlin, DEU',
  description:TPM_JD + ' Cloudscape powers every customer-facing surface of the console.'});
check('"customer-facing" describing the product does not penalise a TPM role',
  tpmIncidental && !tpmIncidental.reasons.includes('-customer-facing'), tpmIncidental && tpmIncidental.reasons.join(' · '));
const tpmPresales = one({title:'Senior Technical Program Manager', company:'Acme', location:'Berlin, DEU',
  description:TPM_JD + ' Partner with account executives during the sales cycle.'});
check('a TPM role that is actually pre-sales is still penalised',
  tpmPresales && tpmPresales.reasons.includes('-customer-facing'), tpmPresales && tpmPresales.reasons.join(' · '));

// ------------------------------------------------ big-tech customer-facing SA

for (const c of ['Amazon', 'Google', 'Meta']) {
  const r = one({title:'Solutions Architect', company:c, location:'Madrid', description:'Own the architecture.'});
  const plain = one({title:'Solutions Architect', company:'Acme', location:'Madrid', description:'Own the architecture.'});
  check(`${c} Solutions Architect is penalised as the vendor's customer-facing role`,
    r && r.reasons.includes('-customer-facing') && r.score === plain.score - 30,
    r && `${r.score} vs ${plain.score} — ${r.reasons.join(' · ')}`);
}
const bloombergSa = one({title:'Solutions Architect', company:'Bloomberg', location:'London', description:'Own the architecture.'});
check("a non-vendor company's Solutions Architect is not caught by the vendor rule",
  bloombergSa && !bloombergSa.reasons.includes('-customer-facing'), bloombergSa && bloombergSa.reasons.join(' · '));

console.log(fail? `\n${fail} FAILURE(S)` : '\nall checks passed');
process.exit(fail?1:0);
