const methodologyAgent = (id, name, requiredCapabilities = []) => defineAgent({
  id,
  name,
  kind: "methodology",
  requiredCapabilities,
});

const roleAgent = (id, name, workflow, openCodeId) => defineAgent({
  id,
  name,
  kind: "role",
  workflow,
  openCodeId,
});

function defineAgent({ id, name, kind, workflow = null, requiredCapabilities = [], openCodeId = `sddp-${id}` }) {
  const methodology = kind === "methodology";
  const canonicalPath = `.github/agents/${methodology ? "_" : ""}${id}.md`;
  return Object.freeze({
    id,
    name,
    kind,
    canonicalPath,
    workflow,
    requiredCapabilities: Object.freeze([...requiredCapabilities]),
    hosts: Object.freeze({
      copilot: canonicalPath,
      claude: methodology ? `.claude/agents/sddp-${id}.md` : null,
      codex: methodology ? `.codex/agents/sddp-${id}.toml` : null,
      opencode: `.opencode/agents/${openCodeId}.md`,
    }),
  });
}

export const delegatedAgents = Object.freeze([
  methodologyAgent("adr-author", "ADRAuthor"),
  methodologyAgent("adversarial-scanner", "AdversarialScanner"),
  methodologyAgent("api-designer", "APIDesigner"),
  methodologyAgent("checklist-reader", "ChecklistReader"),
  methodologyAgent("configuration-auditor", "ConfigurationAuditor"),
  methodologyAgent("context-gatherer", "ContextGatherer"),
  methodologyAgent("database-administrator", "DatabaseAdministrator"),
  methodologyAgent("developer", "Developer"),
  methodologyAgent("plan-validator", "PlanValidator", ["bash/runCommand"]),
  methodologyAgent("policy-auditor", "PolicyAuditor"),
  methodologyAgent("qc-auditor", "QCAuditor"),
  methodologyAgent("requirements-scanner", "RequirementsScanner"),
  methodologyAgent("spec-validator", "SpecValidator", ["bash/runCommand"]),
  methodologyAgent("story-verifier", "StoryVerifier"),
  methodologyAgent("task-tracker", "TaskTracker", ["bash/runCommand"]),
  methodologyAgent("tasks-validator", "TasksValidator", ["bash/runCommand"]),
  methodologyAgent("technical-researcher", "TechnicalResearcher"),
  methodologyAgent("test-evaluator", "TestEvaluator"),
  methodologyAgent("test-planner", "TestPlanner"),
  methodologyAgent("wbs-generator", "WBSGenerator"),
  roleAgent("business-analyst", "Business Analyst", ".github/sddp/workflows/clarify-spec/WORKFLOW.md"),
  roleAgent("compliance-auditor", "Compliance Auditor", ".github/sddp/workflows/analyze-compliance/WORKFLOW.md"),
  roleAgent("devops-strategist", "DevOps Strategist", ".github/sddp/workflows/deployment-operations/WORKFLOW.md"),
  roleAgent("environment-setup", "Onboarding & Environment Setup Analyst", ".github/sddp/workflows/environment-setup/WORKFLOW.md", "sddp-devsetup"),
  roleAgent("product-manager", "Product Manager", ".github/sddp/workflows/specify-feature/WORKFLOW.md"),
  roleAgent("product-strategist", "Product Strategist", ".github/sddp/workflows/product-document/WORKFLOW.md"),
  roleAgent("project-amender", "Project Amender", ".github/sddp/workflows/amend-project/WORKFLOW.md"),
  roleAgent("project-initializer", "Project Initializer", ".github/sddp/workflows/init-project/WORKFLOW.md"),
  roleAgent("project-manager", "Project Manager", ".github/sddp/workflows/generate-tasks/WORKFLOW.md"),
  roleAgent("project-planner", "Project Planner", ".github/sddp/workflows/project-planning/WORKFLOW.md"),
  roleAgent("prototype-retrospective-analyst", "Prototype Retrospective Analyst", ".github/sddp/workflows/prototype-regen/WORKFLOW.md"),
  roleAgent("qa-engineer", "QA Engineer", ".github/sddp/workflows/generate-checklist/WORKFLOW.md"),
  roleAgent("qc-agent", "QC Agent", ".github/sddp/workflows/quality-control/WORKFLOW.md"),
  roleAgent("software-architect", "Software Architect", ".github/sddp/workflows/plan-feature/WORKFLOW.md"),
  roleAgent("software-engineer", "Software Engineer", ".github/sddp/workflows/implement-tasks/WORKFLOW.md"),
  roleAgent("solution-architect", "Solution Architect", ".github/sddp/workflows/system-design/WORKFLOW.md"),
]);

export const openCodeCoordinatorAgents = Object.freeze([
  Object.freeze({
    id: "sddp-autopilot-pipeline",
    path: ".opencode/agents/sddp-autopilot-pipeline.md",
    workflow: ".github/sddp/workflows/autopilot-pipeline/WORKFLOW.md",
  }),
  Object.freeze({
    id: "sddp-implement-qc-loop",
    path: ".opencode/agents/sddp-implement-qc-loop.md",
    workflow: ".github/sddp/workflows/implement-qc-loop/WORKFLOW.md",
  }),
]);

export function validateDelegatedAgentContracts(agents, coordinators = []) {
  const issues = [];
  const ids = new Set();
  const paths = new Set();
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
    } else {
      if (!agent.workflow?.startsWith(".github/sddp/workflows/") || !agent.workflow.endsWith("/WORKFLOW.md")) issues.push(`Role agent ${agent.id} has an invalid workflow target`);
      if (agent.hosts?.claude !== null || agent.hosts?.codex !== null) issues.push(`Role agent ${agent.id} must not declare Claude or Codex wrappers`);
      if (agent.requiredCapabilities?.length > 0) issues.push(`Role agent ${agent.id} must not duplicate host capabilities`);
    }
    for (const candidate of [agent.canonicalPath, ...Object.values(agent.hosts ?? {}).filter(Boolean)]) {
      if (paths.has(candidate) && candidate !== agent.canonicalPath) issues.push(`Duplicate agent host path: ${candidate}`);
      paths.add(candidate);
    }
  }
  for (const coordinator of coordinators) {
    if (!coordinator.path?.startsWith(".opencode/agents/") || !coordinator.workflow?.startsWith(".github/sddp/workflows/")) issues.push(`Invalid OpenCode coordinator: ${coordinator.id ?? "none"}`);
    if (paths.has(coordinator.path)) issues.push(`Duplicate agent host path: ${coordinator.path}`);
    paths.add(coordinator.path);
  }
  return issues;
}

const contractIssues = validateDelegatedAgentContracts(delegatedAgents, openCodeCoordinatorAgents);
if (contractIssues.length > 0) throw new Error(`Invalid delegated-agent registry:\n${contractIssues.join("\n")}`);
