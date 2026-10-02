import type { ReactNode } from "react";
import type { AgentLogStatus } from "@/components/gallery/agent-log-card/AgentLogCard";

/** Track B: one entry per week. Newest first. */
export interface AgentLogEntry {
  week: number;
  entry: number;
  /** Week date range shown in the section heading. */
  range: string;
  task: string;
  agent: string;
  type: string;
  date: string;
  status: AgentLogStatus;
  prompt: string;
  result: ReactNode;
}

export const agentLogs: AgentLogEntry[] = [
  {
    week: 2,
    entry: 1,
    range: "2026-10-02 to 2026-10-08",
    task: "Reusable GHL Troubleshooting Skill",
    agent: "Claude Code · Claude Opus 5.5",
    type: "AI Agent Building",
    date: "2026-10-02",
    status: "built",
    prompt: `Create a reusable GHL Troubleshooting Agent for my LofiStack workflow.
The purpose of this agent is to help me troubleshoot real GoHighLevel client issues in a structured and reliable way.
Core Workflow
When I provide a GHL issue, the agent should:

1. Understand the Issue
   * Identify what is happening.
   * Identify what should happen instead.
   * Summarize the issue clearly before starting the troubleshooting process.
2. Analyze the Root Cause
   * Identify the most likely causes.
   * Review relevant areas such as workflow triggers, conditions, actions, pipelines, custom fields, tags, forms, calendars, integrations, permissions, and other applicable GHL settings.
   * Clearly separate confirmed information from assumptions.
3. Provide Troubleshooting Steps
   * Give me a clear, step-by-step troubleshooting process.
   * Tell me exactly what to check inside GHL.
   * Start with the most likely causes.
   * Avoid unnecessary checks or steps.
4. Recommend a Fix
   * Explain the recommended fix clearly.
   * Provide exact implementation steps whenever possible.
   * Warn me if the change could affect existing workflows, contacts, pipelines, or automations.
5. Create a Testing and QA Checklist
   * Provide a short checklist to use after applying the fix.
   * Include the exact test scenario.
   * Explain the expected result.
   * Help confirm whether the issue has actually been resolved.
6. Provide a Final Summary
At the end, include:
   * Issue
   * Root Cause
   * Fix Applied
   * Test Result
   * Remaining Issues
   * Recommended Next Step

Important Rules

* Do not invent GHL features, settings, results, or test outcomes.
* If important information is missing, ask for the required details before reaching a conclusion.
* Clearly label all assumptions.
* Do not say an issue is fixed unless it has been tested or verified.
* Keep the troubleshooting focused on real client work.
* Use clear, simple language.
* Avoid unnecessary explanations.
* If there are multiple possible causes, rank them by likelihood based on the available evidence.
* Preserve existing working configurations unless there is a clear reason to change them.
* Prioritize safe changes and explain any possible side effects.

Reusability
Make this agent reusable across different GHL client accounts and issue types, including:

* Workflow problems
* Trigger issues
* Automation failures
* Form submission issues
* Pipeline problems
* Custom field issues
* Tag-related issues
* Calendar and appointment issues
* Lead routing
* Attribution
* Webhooks and integrations
* Contact record issues
* CRM data problems
* Testing and QA

The agent should allow me to provide a real GHL problem and receive guidance through the investigation, fix, and verification process.`,
    result: (
      <>
        <p>
          Built a reusable GHL Troubleshooting Skill at <code>.claude/skills/ghl-troubleshooter/SKILL.md</code>.
        </p>
        <p>
          <strong>Status:</strong> Built — Not yet tested on a real GHL issue.
        </p>
      </>
    ),
  },
];
