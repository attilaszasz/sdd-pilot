import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { deepStrictEqual, doesNotMatch, match, notStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const core = read('../.github/agents/_developer.md');
const validation = read('../.github/sddp/workflows/implement-tasks/references/developer-validation.md');
const implementSkill = read('../.github/sddp/workflows/implement-tasks/WORKFLOW.md');
const checklist = read('../.github/sddp/workflows/implement-tasks/references/dry-run-review-checklist.md');
const reference = read('../docs/reference.md');
const gitignore = read('../.gitignore');
const openCodeWrapper = read('../.opencode/agents/sddp-developer.md');
const codexWrapper = read('../.codex/agents/sddp-developer.toml');
const claudeWrapper = read('../.claude/agents/sddp-developer.md');

const OLD_DEVELOPER_PROMPT_BYTES = 17_766;
const CORE_BUDGET_BYTES = 2_048;

const section = (document, heading) => {
  const start = document.indexOf(heading);
  ok(start >= 0, `missing section: ${heading}`);
  const bodyStart = start + heading.length;
  const nextHeading = document.slice(bodyStart).search(/\n##? /);
  return document.slice(bodyStart, nextHeading < 0 ? document.length : bodyStart + nextHeading);
};

// Contract-level simulation for this Markdown-driven workflow. It does not claim to be a runtime dispatcher.
const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');

const priorExports = [
  { TaskID: 'T002', Symbol: 'second', FilePath: 'src/second.js', Signature: '(input) -> output' },
  { TaskID: 'T001', Symbol: 'first', FilePath: 'src/first.js', Signature: '() -> output' },
];

const sortedPriorExports = () => [...priorExports].sort((left, right) => (
  left.TaskID.localeCompare(right.TaskID) || left.Symbol.localeCompare(right.Symbol) || left.FilePath.localeCompare(right.FilePath)
));

const sourceFingerprints = ({ plan = 'plan-1', spec = 'spec-1', research = 'research-1', taskRecord = 'task-1' } = {}) => ({
  procedure: `sha256:${sha256('procedure-1')}`,
  artifacts: {
    'plan.md': `sha256:${sha256(plan)}`,
    'spec.md': `sha256:${sha256(spec)}`,
    'research.md': `sha256:${sha256(research)}`,
  },
  taskList: `sha256:${sha256('tasks-1')}`,
  taskRecord: `sha256:${sha256(taskRecord)}`,
  coverageMatrix: `sha256:${sha256(plan)}`,
});

const buildSlice = ({
  taskId = 'T001',
  description = 'Implement the first task',
  filePath = 'src/first.js',
  dispatchMode = 'first',
  continuationId = 'ctx-1',
  loopIteration = 0,
  priorAttempts = null,
  retryOf = null,
  retryReason = null,
  expectedEvidence = [],
  acceptanceStubs = [],
  priorExportEntries = sortedPriorExports(),
} = {}) => ({
  schema: 'developer-slice/v1',
  version: 1,
  DispatchMode: dispatchMode,
  ContinuationID: continuationId,
  TaskID: taskId,
  Description: description,
  Phase: 'Setup',
  FilePath: filePath,
  Context: 'task-scoped context',
  ScopedContext: {
    Summary: 'task-scoped summary',
    SourceSections: ['plan.md:## Project Structure'],
  },
  ArtifactPaths: {
    FeatureDir: 'specs/00001-feature/',
    SpecPath: 'specs/00001-feature/spec.md',
    PlanPath: 'specs/00001-feature/plan.md',
    ResearchPath: null,
    DataModelPath: null,
    ContractsPath: null,
  },
  Imports: [],
  Exports: [],
  PriorExports: [...priorExportEntries].sort((left, right) => (
    left.TaskID.localeCompare(right.TaskID) || left.Symbol.localeCompare(right.Symbol) || left.FilePath.localeCompare(right.FilePath)
  )),
  ExpectedEvidence: expectedEvidence,
  AcceptanceStubs: acceptanceStubs,
  Verify: [],
  LoopIteration: loopIteration,
  PriorAttempts: priorAttempts,
  BugContext: null,
  RetryOf: retryOf,
  RetryReason: retryReason,
});

const buildState = (slice, fingerprints) => ({
  schema: 'implement-state/v1',
  version: 1,
  runId: 'run-1',
  contextId: slice.ContinuationID,
  featureDir: 'specs/00001-feature/',
  activeTask: slice.TaskID,
  serializedSlice: canonicalJson(slice),
  sliceFingerprint: `sha256:${sha256(canonicalJson(slice))}`,
  sourceFingerprints: fingerprints,
  priorExports: slice.PriorExports,
  phase: 'Setup',
  phaseCounters: { phaseIndex: 0, completed: 0, remaining: 2, blocked: 0, retry: slice.LoopIteration, microqc: 0, iteration: 0 },
  completed: 0,
  remaining: 2,
  blocked: 'none',
  microqc: 'SKIPPED',
  timestamps: { createdAt: '2026-08-10T00:00:00Z', updatedAt: '2026-08-10T00:00:00Z', checkpointedAt: '2026-08-10T00:00:00Z', delegatedAt: null },
  timestamp: '2026-08-10T00:00:00Z',
});

const liveProcedureValid = (previousState, continuationId, fingerprints) => (
  continuationId !== null
  && continuationId === previousState.contextId
  && fingerprints.procedure === previousState.sourceFingerprints.procedure
  && canonicalJson(fingerprints.artifacts) === canonicalJson(previousState.sourceFingerprints.artifacts)
);

const simulateDispatch = ({ previousState = null, taskId, continuationId = 'ctx-1', fingerprints, ...sliceOptions }) => {
  const repeat = previousState && liveProcedureValid(previousState, continuationId, fingerprints);
  const mode = previousState ? (repeat ? 'repeat' : 'reset') : 'first';
  const slice = buildSlice({ ...sliceOptions, taskId, continuationId, dispatchMode: mode });
  const serializedSlice = canonicalJson(slice);
  const payload = mode === 'repeat'
    ? serializedSlice
    : `${core}\n${validation}\n${serializedSlice}`;
  return { mode, slice, payload, state: buildState(slice, fingerprints) };
};

test('DS-001: the core is always required, reaches validation, and stays within the UTF-8 budget', () => {
  match(core, /## Role/);
  match(core, /## DeveloperSlice v1/);
  match(core, /\.github\/sddp\/workflows\/implement-tasks\/references\/developer-validation\.md/);
  strictEqual(Buffer.byteLength(core, 'utf8') <= CORE_BUDGET_BYTES, true, 'compact core must be <= 2,048 UTF-8 bytes');
  ok(!core.includes('## 3.5 Requirement Self-Verification'), 'detailed validation must not be repeated in the core');
  for (const heading of ['## 3.5 Requirement Self-Verification', '## 3.6 Divergence Detection', '## 3.7 VERIFY Assertions', '## 3.8 Export Contract Verification']) {
    ok(section(validation, heading).length > 0, `${heading} must remain reachable in the reference`);
  }
});

test('DS-002: DeveloperSlice v1 exposes canonical task, scope, interface, evidence, stub, verify, and retry fields', () => {
  const contract = section(implementSkill, '### DeveloperSlice v1 schema');
  for (const field of [
    'schema: developer-slice/v1', 'version: 1', 'DispatchMode', 'ContinuationID', 'TaskID', 'Description', 'Phase', 'FilePath',
    'Context', 'ScopedContext:', 'Summary:', 'SourceSections:', 'ArtifactPaths:', 'Imports:', 'Exports:', 'PriorExports:',
    'ExpectedEvidence:', 'AcceptanceStubs: []', 'Verify:', 'LoopIteration:', 'PriorAttempts:', 'BugContext:', 'RetryOf:', 'RetryReason:',
  ]) {
    ok(contract.includes(field), `DeveloperSlice must contain ${field}`);
  }
  match(implementSkill, /PriorExports.*exactly.*TaskID, Symbol, FilePath, Signature/);
  match(implementSkill, /serializedSlice.*canonical JSON string/);
});

test('DS-003: validation order, error types, and unchanged SUCCESS/FAILURE envelope stay explicit', () => {
  match(core, /0 -> 1 -> 2 -> 3 -> 3\.5 -> 3\.6 -> 3\.7 -> 3\.8 -> 4/);
  match(core, /dependency \| import \| type \| test \| lint \| compilation \| requirement-gap \| verify-failure \| export-contract \| unknown/);
  match(core, /Status: SUCCESS/);
  match(core, /Status: FAILURE/);
  for (const label of ['Status', 'Confidence', 'Changes', 'Verification', 'Divergences', 'Error Details']) {
    match(core, new RegExp(`\\*\\*${label}\\*\\*`), `${label} must remain in the output envelope`);
  }
  deepStrictEqual(
    [...core.matchAll(/\*\*(Status|Confidence|Changes|Verification|Divergences|Error Details)\*\*/g)].map((entry) => entry[1]),
    ['Status', 'Confidence', 'Changes', 'Verification', 'Divergences', 'Error Details'],
  );
});

test('DS-004: trusted T001 -> T002 repeat rebuilds only the fresh slice', () => {
  const fingerprints = sourceFingerprints({ taskRecord: 'T001' });
  const first = simulateDispatch({ taskId: 'T001', fingerprints });
  const nextFingerprints = sourceFingerprints({ taskRecord: 'T002' });
  const next = simulateDispatch({ previousState: first.state, taskId: 'T002', continuationId: 'ctx-1', fingerprints: nextFingerprints, description: 'Implement the second task', filePath: 'src/second.js' });

  strictEqual(first.mode, 'first');
  strictEqual(next.mode, 'repeat');
  strictEqual(next.slice.TaskID, 'T002');
  strictEqual(next.state.contextId, next.slice.ContinuationID);
  strictEqual(next.state.activeTask, 'T002');
  strictEqual(next.payload, canonicalJson(next.slice));
  doesNotMatch(next.payload, /## Role/);
  doesNotMatch(next.payload, /# Developer Validation Procedure/);
  doesNotMatch(next.payload, /## 0\. Acquire Skills/);
  match(implementSkill, /same trustworthy `ContinuationID` as state `contextId`/);
  match(implementSkill, /Do \*\*not\*\* require the current `activeTask`, task ID, task-record fingerprint/);
  match(implementSkill, /T001 → T002.*fresh T002 slice.*send that serialized slice only/);
});

test('DS-005: missing continuation or stale plan/spec artifacts reset to full bootstrap', () => {
  const first = simulateDispatch({ taskId: 'T001', fingerprints: sourceFingerprints({ taskRecord: 'T001' }) });
  const staleSources = [
    { ...sourceFingerprints({ taskRecord: 'T001' }), procedure: `sha256:${sha256('procedure-2')}` },
    sourceFingerprints({ plan: 'plan-2', taskRecord: 'T001' }),
    sourceFingerprints({ spec: 'spec-2', taskRecord: 'T001' }),
    sourceFingerprints({ research: 'research-2', taskRecord: 'T001' }),
  ];
  const stale = staleSources.map((fingerprints) => simulateDispatch({ previousState: first.state, taskId: 'T001', continuationId: 'ctx-1', fingerprints }));
  const reset = simulateDispatch({ previousState: first.state, taskId: 'T002', continuationId: null, fingerprints: sourceFingerprints({ taskRecord: 'T002' }) });

  for (const staleDispatch of stale) {
    strictEqual(staleDispatch.mode, 'reset');
    match(staleDispatch.payload, /# Developer Validation Procedure/);
  }
  strictEqual(reset.mode, 'reset');
  match(reset.payload, /# Developer Validation Procedure/);
  notStrictEqual(stale[1].state.sourceFingerprints.artifacts['plan.md'], first.state.sourceFingerprints.artifacts['plan.md']);
  match(implementSkill, /procedure fingerprint changes/);
  match(implementSkill, /plan\/spec\/scoped artifact fingerprint is stale\/missing/);
});

test('DS-006: retry parity refreshes loop fields while retaining all slice fields and normalized stubs', () => {
  const first = simulateDispatch({ taskId: 'T001', fingerprints: sourceFingerprints({ taskRecord: 'T001' }) });
  const retry = simulateDispatch({
    previousState: first.state,
    taskId: 'T001',
    continuationId: 'ctx-1',
    fingerprints: sourceFingerprints({ taskRecord: 'T001-retry' }),
    loopIteration: 1,
    priorAttempts: 'test failed: old approach',
    retryOf: 'dispatch-1',
    retryReason: 'test failure',
    acceptanceStubs: [],
  });
  const expectedFields = ['schema', 'version', 'DispatchMode', 'ContinuationID', 'TaskID', 'Description', 'Phase', 'FilePath', 'Context', 'ScopedContext', 'ArtifactPaths', 'Imports', 'Exports', 'PriorExports', 'ExpectedEvidence', 'AcceptanceStubs', 'Verify', 'LoopIteration', 'PriorAttempts', 'BugContext', 'RetryOf', 'RetryReason'];

  strictEqual(retry.mode, 'repeat');
  deepStrictEqual(Object.keys(retry.slice).sort(), expectedFields.sort());
  strictEqual(retry.slice.LoopIteration, 1);
  strictEqual(retry.slice.PriorAttempts, 'test failed: old approach');
  strictEqual(retry.slice.RetryOf, 'dispatch-1');
  deepStrictEqual(retry.slice.AcceptanceStubs, []);
  const matchingStub = buildSlice({
    acceptanceStubs: [{ reqID: 'FR-001', testFile: 'tests/feature.test.mjs', stubBlocks: ['FR-001'], redStatus: 'pending' }],
    expectedEvidence: [{ reqID: 'FR-001', filePaths: ['src/first.js'], functions: ['first'] }],
  });
  deepStrictEqual(matchingStub.AcceptanceStubs, [{ reqID: 'FR-001', testFile: 'tests/feature.test.mjs', stubBlocks: ['FR-001'], redStatus: 'pending' }]);
  match(validation, /stub test file.*RED/);
  match(validation, /stub blocks.*GREEN/);
  match(validation, /skip this sub-check when an `AcceptanceStub` exists for this `reqID`/);
  match(implementSkill, /Retry parity means no validation field is dropped/);
});

test('DS-007: state JSON is canonical, maps identity, and persists normalized PriorExports/fingerprints', () => {
  const slice = buildSlice({ acceptanceStubs: [] });
  const state = buildState(slice, sourceFingerprints());
  const stateJson = canonicalJson(state);
  const parsedState = JSON.parse(stateJson);
  const parsedSlice = JSON.parse(parsedState.serializedSlice);

  strictEqual(stateJson, canonicalJson(parsedState));
  strictEqual(parsedState.serializedSlice, canonicalJson(parsedSlice));
  strictEqual(parsedState.contextId, parsedSlice.ContinuationID);
  deepStrictEqual(parsedState.priorExports, sortedPriorExports());
  deepStrictEqual(parsedSlice.PriorExports, sortedPriorExports());
  deepStrictEqual(parsedSlice.AcceptanceStubs, []);
  deepStrictEqual(Object.keys(parsedState.sourceFingerprints), ['artifacts', 'coverageMatrix', 'procedure', 'taskList', 'taskRecord']);
  deepStrictEqual(Object.keys(parsedState.sourceFingerprints.artifacts), ['plan.md', 'research.md', 'spec.md']);
  match(implementSkill, /ContinuationID.*copied verbatim to state `contextId`/);
  match(implementSkill, /Canonical JSON is UTF-8/);
});

test('DS-008: representative payload bytes beat the old prompt baseline and repeat omits bootstrap content', (t) => {
  const first = simulateDispatch({ taskId: 'T001', priorExportEntries: [], fingerprints: sourceFingerprints({ taskRecord: 'T001' }) });
  const repeat = simulateDispatch({ previousState: first.state, taskId: 'T002', priorExportEntries: [], continuationId: 'ctx-1', fingerprints: sourceFingerprints({ taskRecord: 'T002' }) });
  const firstBytes = Buffer.byteLength(first.payload, 'utf8');
  const repeatBytes = Buffer.byteLength(repeat.payload, 'utf8');

  t.diagnostic(`UTF-8 bytes: core=${Buffer.byteLength(core, 'utf8')}, firstBootstrap=${firstBytes}, repeat=${repeatBytes}, oldBaseline=${OLD_DEVELOPER_PROMPT_BYTES}`);
  ok(firstBytes < OLD_DEVELOPER_PROMPT_BYTES, `first bootstrap ${firstBytes} bytes should stay below ${OLD_DEVELOPER_PROMPT_BYTES}`);
  ok(repeatBytes < OLD_DEVELOPER_PROMPT_BYTES, `repeat ${repeatBytes} bytes should stay below ${OLD_DEVELOPER_PROMPT_BYTES}`);
  ok(repeatBytes < firstBytes, 'repeat payload should be smaller than first bootstrap');
  ok(Buffer.byteLength(core, 'utf8') <= CORE_BUDGET_BYTES);
  doesNotMatch(repeat.payload, /Read `\.github\/skills\/implementation-standards\/SKILL\.md`/);
  doesNotMatch(repeat.payload, /## Role/);
  match(reference, /2,048-byte core budget/);
  match(checklist, /2,048-byte core budget/);
});

test('DS-009: existing platform wrappers still reach the canonical Developer core', () => {
  match(openCodeWrapper, /\.github\/agents\/_developer\.md/);
  match(codexWrapper, /\.github\/agents\/_developer\.md/);
  match(claudeWrapper, /\.github\/agents\/_developer\.md/);
  match(reference, /canonical, always-required compact core/);
  match(checklist, /scripts\/drift-report\.mjs --strict/);
  match(gitignore, /^\.implement-state$/m);
});
