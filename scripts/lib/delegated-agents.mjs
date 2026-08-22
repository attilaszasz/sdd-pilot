const methodologyAgent = (id, name, executionPolicy, requiredCapabilities = []) => defineAgent({
  id,
  name,
  kind: "methodology",
  executionPolicy,
  requiredCapabilities,
});

const roleAgent = (id, name, workflow, { openCodeId, bash = "deny" } = {}) => defineAgent({
  id,
  name,
  kind: "role",
  workflow,
  executionPolicy: rolePolicy(bash),
  openCodeId,
});

function defineAgent({ id, name, kind, workflow = null, requiredCapabilities = [], executionPolicy = null, openCodeId = `sddp-${id}` }) {
  const methodology = kind === "methodology";
  const canonicalPath = `.github/agents/${methodology ? "_" : ""}${id}.md`;
  return Object.freeze({
    id,
    name,
    kind,
    canonicalPath,
    workflow,
    requiredCapabilities: Object.freeze([...requiredCapabilities]),
    executionPolicy: freezeExecutionPolicy(executionPolicy),
    hosts: Object.freeze({
      copilot: canonicalPath,
      claude: methodology ? `.claude/agents/sddp-${id}.md` : null,
      codex: methodology ? `.codex/agents/sddp-${id}.toml` : null,
      opencode: `.opencode/agents/${openCodeId}.md`,
    }),
  });
}

function freezeExecutionPolicy(executionPolicy) {
  if (!executionPolicy) return null;
  return Object.freeze({
    ...(executionPolicy.claude ? {
      claude: Object.freeze({
        tools: Object.freeze([...executionPolicy.claude.tools]),
        handoff: executionPolicy.claude.handoff ?? null,
      }),
    } : {}),
    ...(executionPolicy.codex ? { codex: Object.freeze({ sandboxMode: executionPolicy.codex.sandboxMode }) } : {}),
    ...(executionPolicy.opencode ? {
      opencode: Object.freeze({
        edit: executionPolicy.opencode.edit,
        bash: typeof executionPolicy.opencode.bash === "object" ? Object.freeze({ ...executionPolicy.opencode.bash }) : executionPolicy.opencode.bash,
        task: executionPolicy.opencode.task,
      }),
    } : {}),
  });
}

export const delegatedAgents = Object.freeze([
  methodologyAgent("adr-author", "ADRAuthor", policy(["Read", "Write", "Edit", "Grep", "Glob"], "workspace-write", "allow", "deny")),
  methodologyAgent("adversarial-scanner", "AdversarialScanner", policy(["Read"], "read-only", "deny", "deny", "structured-parent")),
  methodologyAgent("api-designer", "APIDesigner", policy(["Read", "Write", "Edit", "Grep", "Glob"], "workspace-write", "allow", "deny")),
  methodologyAgent("checklist-reader", "ChecklistReader", policy(["Read", "Grep", "Glob"], "read-only", "deny", "deny")),
  methodologyAgent("configuration-auditor", "ConfigurationAuditor", policy(["Read", "Edit", "Grep", "Glob"], "workspace-write", "allow", "deny")),
  methodologyAgent("context-gatherer", "ContextGatherer", policy(["Read", "Write", "Edit", "Bash", "Grep", "Glob"], "workspace-write", "allow", "allow")),
  methodologyAgent("database-administrator", "DatabaseAdministrator", policy(["Read", "Write", "Edit", "Grep", "Glob"], "workspace-write", "allow", "deny")),
  methodologyAgent("developer", "Developer", policy(["Read", "Write", "Edit", "Bash", "Grep", "Glob"], "workspace-write", "allow", "allow")),
  methodologyAgent("plan-validator", "PlanValidator", policy(["Read", "Bash"], "workspace-write", "deny", "allow", "structured-parent"), ["bash/runCommand"]),
  methodologyAgent("policy-auditor", "PolicyAuditor", policy(["Read", "Grep", "Glob"], "read-only", "deny", "deny")),
  methodologyAgent("qc-auditor", "QCAuditor", policy(["Read", "Bash", "Grep", "Glob", "AskUserQuestion"], "workspace-write", "allow", "allow")),
  methodologyAgent("requirements-scanner", "RequirementsScanner", policy(["Read", "Grep", "Glob"], "read-only", "deny", "deny")),
  methodologyAgent("spec-validator", "SpecValidator", policy(["Read", "Write", "Grep", "Glob", "Bash"], "workspace-write", "allow", "allow"), ["bash/runCommand"]),
  methodologyAgent("story-verifier", "StoryVerifier", policy(["Read", "Bash", "Grep", "Glob"], "read-only", "allow", "deny")),
  methodologyAgent("task-tracker", "TaskTracker", policy(["Read", "Grep", "Glob", "Bash"], "read-only", "allow", "allow"), ["bash/runCommand"]),
  methodologyAgent("tasks-validator", "TasksValidator", policy(["Read", "Bash"], "workspace-write", "deny", "allow", "structured-parent"), ["bash/runCommand"]),
  methodologyAgent("technical-researcher", "TechnicalResearcher", policy(["Read", "Grep", "Glob", "WebFetch", "WebSearch"], "read-only", "deny", "deny")),
  methodologyAgent("test-evaluator", "TestEvaluator", policy(["Read", "Edit", "Grep", "Glob", "AskUserQuestion"], "workspace-write", "allow", "deny")),
  methodologyAgent("test-planner", "TestPlanner", policy(["Read", "Write", "Edit", "Grep", "Glob"], "workspace-write", "allow", "deny")),
  methodologyAgent("wbs-generator", "WBSGenerator", policy(["Read", "Write", "Edit", "Grep", "Glob"], "workspace-write", "allow", "deny")),
  roleAgent("business-analyst", "Business Analyst", ".github/sddp/workflows/clarify-spec/WORKFLOW.md"),
  roleAgent("compliance-auditor", "Compliance Auditor", ".github/sddp/workflows/analyze-compliance/WORKFLOW.md"),
  roleAgent("devops-strategist", "DevOps Strategist", ".github/sddp/workflows/deployment-operations/WORKFLOW.md"),
  roleAgent("environment-setup", "Onboarding & Environment Setup Analyst", ".github/sddp/workflows/environment-setup/WORKFLOW.md", { openCodeId: "sddp-devsetup", bash: "allow" }),
  roleAgent("product-manager", "Product Manager", ".github/sddp/workflows/specify-feature/WORKFLOW.md"),
  roleAgent("product-strategist", "Product Strategist", ".github/sddp/workflows/product-document/WORKFLOW.md"),
  roleAgent("project-amender", "Project Amender", ".github/sddp/workflows/amend-project/WORKFLOW.md"),
  roleAgent("project-initializer", "Project Initializer", ".github/sddp/workflows/init-project/WORKFLOW.md"),
  roleAgent("project-manager", "Project Manager", ".github/sddp/workflows/generate-tasks/WORKFLOW.md"),
  roleAgent("project-planner", "Project Planner", ".github/sddp/workflows/project-planning/WORKFLOW.md"),
  roleAgent("prototype-retrospective-analyst", "Prototype Retrospective Analyst", ".github/sddp/workflows/prototype-regen/WORKFLOW.md"),
  roleAgent("qa-engineer", "QA Engineer", ".github/sddp/workflows/generate-checklist/WORKFLOW.md"),
  roleAgent("qc-agent", "QC Agent", ".github/sddp/workflows/quality-control/WORKFLOW.md", { bash: "allow" }),
  roleAgent("software-architect", "Software Architect", ".github/sddp/workflows/plan-feature/WORKFLOW.md", { bash: "allow" }),
  roleAgent("software-engineer", "Software Engineer", ".github/sddp/workflows/implement-tasks/WORKFLOW.md", { bash: "allow" }),
  roleAgent("solution-architect", "Solution Architect", ".github/sddp/workflows/system-design/WORKFLOW.md", { bash: { "*": "deny", "node scripts/validate-sad.mjs *": "allow" } }),
]);

function policy(tools, sandboxMode, edit, bash, handoff = null) {
  return {
    claude: { tools, handoff },
    codex: { sandboxMode },
    opencode: { edit, bash, task: "deny-all" },
  };
}

function rolePolicy(bash) {
  return { opencode: { edit: "allow", bash, task: "workflow-reachable" } };
}

export const openCodeCoordinatorAgents = Object.freeze([
  coordinatorAgent("sddp-autopilot-pipeline", ".github/sddp/workflows/autopilot-pipeline/WORKFLOW.md"),
  coordinatorAgent("sddp-implement-qc-loop", ".github/sddp/workflows/implement-qc-loop/WORKFLOW.md"),
]);

function coordinatorAgent(id, workflow) {
  return Object.freeze({
    id,
    path: `.opencode/agents/${id}.md`,
    workflow,
    executionPolicy: freezeExecutionPolicy(rolePolicy("allow")),
  });
}

export function validateDelegatedAgentContracts(agents, coordinators = []) {
  const issues = [];
  const ids = new Set();
  const paths = new Set();
  const openCodeIds = new Set();
  for (const agent of agents) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agent.id ?? "")) issues.push(`Invalid agent ID: ${agent.id ?? "none"}`);
    if (ids.has(agent.id)) issues.push(`Duplicate agent ID: ${agent.id}`);
    ids.add(agent.id);
    if (!agent.name) issues.push(`Agent ${agent.id} is missing a name`);
    if (!["methodology", "role"].includes(agent.kind)) issues.push(`Agent ${agent.id} has unsupported kind: ${agent.kind}`);
    const prefix = agent.kind === "methodology" ? "_" : "";
    if (agent.canonicalPath !== `.github/agents/${prefix}${agent.id}.md`) issues.push(`Agent ${agent.id} has an invalid canonical path`);
    if (agent.hosts?.copilot !== agent.canonicalPath) issues.push(`Agent ${agent.id} has an invalid Copilot path`);
    if (!agent.hosts?.opencode?.startsWith(".opencode/agents/")) issues.push(`Agent ${agent.id} has an invalid OpenCode path`);
    if (agent.kind === "methodology") {
      if (agent.workflow !== null) issues.push(`Methodology agent ${agent.id} must not target a workflow`);
      if (agent.hosts?.claude !== `.claude/agents/sddp-${agent.id}.md`) issues.push(`Methodology agent ${agent.id} has an invalid Claude path`);
      if (agent.hosts?.codex !== `.codex/agents/sddp-${agent.id}.toml`) issues.push(`Methodology agent ${agent.id} has an invalid Codex path`);
      const policy = agent.executionPolicy;
      if (!Array.isArray(policy?.claude?.tools) || policy.claude.tools.length === 0 || new Set(policy.claude.tools).size !== policy.claude.tools.length) issues.push(`Methodology agent ${agent.id} has invalid Claude tools`);
      if (![null, "structured-parent"].includes(policy?.claude?.handoff)) issues.push(`Methodology agent ${agent.id} has an invalid Claude handoff policy`);
      if (!["read-only", "workspace-write"].includes(policy?.codex?.sandboxMode)) issues.push(`Methodology agent ${agent.id} has an invalid Codex sandbox mode`);
      if (!["allow", "deny"].includes(policy?.opencode?.edit) || !["allow", "deny"].includes(policy?.opencode?.bash) || policy?.opencode?.task !== "deny-all") issues.push(`Methodology agent ${agent.id} has an invalid OpenCode policy`);
    } else {
      if (!agent.workflow?.startsWith(".github/sddp/workflows/") || !agent.workflow.endsWith("/WORKFLOW.md")) issues.push(`Role agent ${agent.id} has an invalid workflow target`);
      if (agent.hosts?.claude !== null || agent.hosts?.codex !== null) issues.push(`Role agent ${agent.id} must not declare Claude or Codex wrappers`);
      if (agent.requiredCapabilities?.length > 0) issues.push(`Role agent ${agent.id} must not duplicate host capabilities`);
      if (agent.executionPolicy?.claude || agent.executionPolicy?.codex) issues.push(`Role agent ${agent.id} must not declare Claude or Codex execution policy`);
      if (!validOpenCodeWorkflowPolicy(agent.executionPolicy?.opencode)) issues.push(`Role agent ${agent.id} has an invalid OpenCode workflow policy`);
    }
    for (const candidate of [agent.canonicalPath, ...Object.values(agent.hosts ?? {}).filter(Boolean)]) {
      if (paths.has(candidate) && candidate !== agent.canonicalPath) issues.push(`Duplicate agent host path: ${candidate}`);
      paths.add(candidate);
    }
    const openCodeId = agent.hosts?.opencode?.match(/^\.opencode\/agents\/([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/)?.[1];
    if (openCodeId) openCodeIds.add(openCodeId);
  }
  for (const coordinator of coordinators) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(coordinator.id ?? "")) issues.push(`Invalid OpenCode coordinator ID: ${coordinator.id ?? "none"}`);
    if (openCodeIds.has(coordinator.id)) issues.push(`Duplicate OpenCode coordinator ID: ${coordinator.id}`);
    openCodeIds.add(coordinator.id);
    if (coordinator.path !== `.opencode/agents/${coordinator.id}.md`) issues.push(`OpenCode coordinator ${coordinator.id ?? "none"} has an invalid path`);
    if (!/^\.github\/sddp\/workflows\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+WORKFLOW\.md$/.test(coordinator.workflow ?? "")) issues.push(`OpenCode coordinator ${coordinator.id ?? "none"} has an invalid workflow target`);
    if (!validOpenCodeWorkflowPolicy(coordinator.executionPolicy?.opencode)) issues.push(`OpenCode coordinator ${coordinator.id} has an invalid execution policy`);
    if (paths.has(coordinator.path)) issues.push(`Duplicate agent host path: ${coordinator.path}`);
    paths.add(coordinator.path);
  }
  return issues;
}

function validOpenCodeWorkflowPolicy(policy) {
  const bash = policy?.bash;
  const validBash = ["allow", "deny"].includes(bash)
    || (bash && typeof bash === "object" && !Array.isArray(bash) && Object.keys(bash).length > 0 && Object.values(bash).every((action) => ["allow", "deny"].includes(action)));
  return policy?.edit === "allow" && validBash && policy?.task === "workflow-reachable";
}

const contractIssues = validateDelegatedAgentContracts(delegatedAgents, openCodeCoordinatorAgents);
if (contractIssues.length > 0) throw new Error(`Invalid delegated-agent registry:\n${contractIssues.join("\n")}`);
