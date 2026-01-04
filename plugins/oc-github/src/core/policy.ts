import type { ApprovalManager } from './approval.js'
import type { AccessDecision, PolicyConfig, PolicyRequest } from './types.js'

export class PolicyEngine {
  constructor(
    private config: PolicyConfig,
    private approvalManager: ApprovalManager
  ) {}

  evaluate(request: PolicyRequest, sessionId: string): AccessDecision {
    if (request.capability === 'read') {
      return { outcome: 'allowed', reason: 'Read operations are always allowed' }
    }

    const slug = `${request.resource.owner}/${request.resource.repo}`

    if (this.config.denylist.length > 0 && this.matchesAny(slug, this.config.denylist)) {
      return { outcome: 'denied', reason: 'Repository is explicitly denied' }
    }

    if (this.matchesAny(slug, this.config.allowlist)) {
      return { outcome: 'allowed', reason: 'Repository is on the allowlist' }
    }

    if (this.approvalManager.isApproved(sessionId, request)) {
      return { outcome: 'allowed', reason: 'Operation approved for this session' }
    }

    return {
      outcome: 'needs_approval',
      reason: `Write operation to ${slug} requires explicit approval or allowlist entry`,
    }
  }

  private matchesAny(slug: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      if (pattern === '*') return true
      if (pattern.endsWith('/*')) {
        const org = pattern.slice(0, -2)
        return slug.startsWith(`${org}/`)
      }
      return slug === pattern
    })
  }
}
