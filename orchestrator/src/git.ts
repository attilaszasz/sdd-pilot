import { execSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "./logger.js";
import type { Epic } from "./types.js";
import { epicTitleToSlug } from "./project-plan.js";

function buildGitBootstrapHelp(workspaceRoot: string): string {
  return [
    `Resolved workspace root: ${workspaceRoot}`,
    "Orchestrator requires a real git repository with an 'origin' remote, a local 'main' branch, and a clean working tree.",
    "If this project was created from a zip or copied manually, initialize git first:",
    "  git init -b main",
    "  git add .",
    "  git commit -m \"Initial commit\"",
    "  git remote add origin <repo-url>",
    "Then re-run the orchestrator from the orchestrator directory.",
  ].join("\n");
}

// Helper to run commands
function runCmd(cmd: string, cwd?: string, hideOutput = false): string {
  try {
    const output = execSync(cmd, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    });
    return output.trim();
  } catch (error: any) {
    const stdout = hideOutput ? "" : (error.stdout ?? "");
    const stderr = hideOutput ? "" : (error.stderr ?? "");
    throw new Error(`Command failed: ${cmd}\n${error.message}\n${stdout}\n${stderr}`);
  }
}

export function verifyGitState(workspaceRoot: string): void {
  logger.info("Verifying git & gh requirements...");

  let gitRoot = "";

  // 1. Check if git repo
  try {
    gitRoot = runCmd("git rev-parse --show-toplevel", workspaceRoot, true);
  } catch {
    throw new Error(`Not a git repository.\n${buildGitBootstrapHelp(workspaceRoot)}`);
  }

  // 2. Check remote origin
  const remotes = runCmd("git remote", gitRoot, true);
  if (!remotes.split("\n").some(line => line.startsWith("origin"))) {
    throw new Error(`No 'origin' remote found.\nResolved git root: ${gitRoot}\nAdd one with: git remote add origin <repo-url>`);
  }

  // 3. Check current branch is main
  const currentBranch = runCmd("git branch --show-current", gitRoot, true);
  if (currentBranch !== "main") {
    throw new Error(`Current branch is '${currentBranch}'. Orchestrator must be run from 'main'.\nResolved git root: ${gitRoot}`);
  }

  // 4. Check there are no uncommitted changes
  const uncommitted = runCmd("git status --porcelain", gitRoot, true);
  if (uncommitted !== "") {
    throw new Error(`There are uncommitted changes on main. Please commit or stash them before running the orchestrator.\nResolved git root: ${gitRoot}`);
  }

  // 5. Check gh is installed and authenticated
  try {
    runCmd("gh auth status", gitRoot, true);
  } catch {
    throw new Error("GitHub CLI (gh) is not installed or not authenticated. Please run 'gh auth login'.");
  }
  
  logger.success("Git & gh requirements verified.");
}

export function getEpicBranchName(epic: Epic): string {
  const slug = epicTitleToSlug(epic.title);
  return `${epic.id.toLowerCase()}-${slug}`;
}

export function setupEpicWorkspace(epic: Epic, isParallel: boolean, workspaceRoot: string): string {
  const branchName = getEpicBranchName(epic);
  
  if (isParallel) {
    const worktreePath = join(workspaceRoot, ".worktrees", branchName);
    logger.info(`Creating git worktree for parallel epic execution: ${branchName}`, epic.id);
    
    if (existsSync(worktreePath)) {
      // Clean up existing worktree if left over
      logger.warn(`Worktree already exists at ${worktreePath}, cleaning it up...`, epic.id);
      try {
        runCmd(`git worktree remove --force ${worktreePath}`, workspaceRoot, true);
      } catch (e: any) {
        logger.warn(`Cleanup failed, attempting native remove: ${e.message}`, epic.id);
      }
    }
    
    // Check if branch already exists locally
    let branchExists = false;
    try {
      runCmd(`git show-ref --verify refs/heads/${branchName}`, workspaceRoot, true);
      branchExists = true;
    } catch {
      branchExists = false;
    }

    if (branchExists) {
      // Branch exists locally, create worktree and checkout existing branch
      runCmd(`git worktree add ${worktreePath} ${branchName}`, workspaceRoot, true);
    } else {
      // Branch does not exist, create new branch from main
      runCmd(`git worktree add -b ${branchName} ${worktreePath} main`, workspaceRoot, true);
    }
    
    return worktreePath;
  } else {
    logger.info(`Creating branch for epic execution: ${branchName}`, epic.id);
    // Sequential: just checkout a new branch in the main workspace
    let branchExists = false;
    try {
      runCmd(`git show-ref --verify refs/heads/${branchName}`, workspaceRoot, true);
      branchExists = true;
    } catch {
      branchExists = false;
    }

    if (branchExists) {
      runCmd(`git checkout ${branchName}`, workspaceRoot, true);
    } else {
      runCmd(`git checkout -b ${branchName} main`, workspaceRoot, true);
    }
    return workspaceRoot;
  }
}

export function teardownEpicWorkspace(epic: Epic, workspacePath: string, isParallel: boolean, workspaceRoot: string): void {
  const branchName = getEpicBranchName(epic);
  
  if (isParallel) {
    logger.info(`Removing git worktree: ${branchName}`, epic.id);
    try {
      // Force remove the worktree
      runCmd(`git worktree remove --force ${workspacePath}`, workspaceRoot, true);
      
      // Also delete the branch locally to clean up
      try {
        runCmd(`git branch -D ${branchName}`, workspaceRoot, true);
      } catch {}
    } catch (e: any) {
      logger.warn(`Failed to remove worktree: ${e.message}`, epic.id);
    }
  } else {
    logger.info(`Checking out main`, epic.id);
    try {
      runCmd(`git checkout main`, workspaceRoot, true);
      runCmd(`git pull origin main`, workspaceRoot, true);
      // Clean up branch locally
      try {
        runCmd(`git branch -D ${branchName}`, workspaceRoot, true);
      } catch {}
    } catch (e: any) {
      logger.warn(`Failed to checkout main: ${e.message}`, epic.id);
    }
  }
}

export function commitAndMergeEpic(epic: Epic, workspacePath: string, workspaceRoot: string): void {
  const branchName = getEpicBranchName(epic);
  logger.info(`Committing and creating PR for epic ${epic.id}...`, epic.id);
  
  try {
    // 1. Add all changes
    runCmd(`git add .`, workspacePath, true);
    
    // 2. Check if there are changes to commit
    let status = "";
    try {
      status = runCmd(`git status --porcelain`, workspacePath, true);
    } catch (e) {}

    if (!status) {
      logger.info(`No changes to commit for epic ${epic.id}`, epic.id);
      return;
    }
    
    // 3. Commit
    runCmd(`git commit -m "feat: ${epic.id} - ${epic.title}"`, workspacePath, true);
    
    // 4. Push to origin
    logger.info(`Pushing to origin/${branchName}...`, epic.id);
    runCmd(`git push -u origin HEAD`, workspacePath, true);
    
    // 5. Create PR using gh
    logger.info(`Creating Pull Request...`, epic.id);
    const prTitle = `Complete Epic ${epic.id}: ${epic.title}`;
    
    // Write the PR description to a temporary file
    const prBody = `# Epic ${epic.id}: ${epic.title}

## Description
${epic.specifyInputDescription || 'Automated completion of epic.'}

_Automated pull request by SDD Orchestrator._`;
    const tempBodyFile = join(workspacePath, `.pr-body-${epic.id}.md`);
    writeFileSync(tempBodyFile, prBody, "utf8");

    try {
      // Create PR with title and body file
      runCmd(`gh pr create --title "${prTitle}" --body-file "${tempBodyFile}"`, workspacePath, true);
    } finally {
      // Clean up the temporary file immediately
      try {
        unlinkSync(tempBodyFile);
      } catch (e) {}
    }
    
    // 6. Wait for checks & Merge PR
    logger.info(`Waiting for PR checks to pass...`, epic.id);
    try {
      runCmd(`gh pr checks --watch`, workspacePath, true);
    } catch (e: any) {
      logger.warn(`Wait for checks failed or timed out: ${e.message}. Proceeding to merge...`, epic.id);
    }
    
    logger.info(`Merging PR...`, epic.id);
    try {
      runCmd(`gh pr merge --squash --delete-branch`, workspacePath, true);
    } catch (e) {
      // Try with admin if it fails (e.g. requires review)
      logger.warn(`Normal merge failed, attempting --admin merge...`, epic.id);
      runCmd(`gh pr merge --squash --delete-branch --admin`, workspacePath, true);
    }
    
    logger.success(`PR merged successfully`, epic.id);
  } catch (error: any) {
    throw new Error(`Failed to commit and merge PR:\n${error.message}`);
  }
}
