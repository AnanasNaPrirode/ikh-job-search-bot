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
  staffEm && staffEm.reasons.includes('lead/staff title'), staffEm && staffEm.reasons.join(' · '));

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

console.log(fail? `\n${fail} FAILURE(S)` : '\nall checks passed');
process.exit(fail?1:0);
