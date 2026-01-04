import type { Plugin } from '@opencode-ai/plugin'
import { ConfigManager } from './core/config.js'
import { PolicyEngine } from './core/policy.js'
import { ApprovalManager } from './core/approval.js'
import { AuditLogger } from './core/audit.js'
import { GitHubHttpTransport } from './adapters/transport.js'
import { createGitHubTools } from './tools/index.js'

const plugin: Plugin = async (input) => {
  const configManager = new ConfigManager({ worktree: input.worktree })
  const config = await configManager.load()

  const approvalManager = new ApprovalManager()
  const policyEngine = new PolicyEngine(config.policy, approvalManager)
  const auditLogger = new AuditLogger(config.audit)
  const transport = new GitHubHttpTransport(config.auth, auditLogger)

  return {
    tool: createGitHubTools({
      policyEngine,
      approvalManager,
      auditLogger,
      transport,
    }),
  }
}

export default plugin
