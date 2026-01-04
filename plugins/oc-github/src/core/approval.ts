import type { PolicyRequest } from './types.js'

export class ApprovalManager {
  private approvedRequests = new Set<string>()

  approve(sessionId: string, request: PolicyRequest): void {
    this.approvedRequests.add(this.getKey(sessionId, request.action, request.resource.owner, request.resource.repo))
  }

  approveRepo(sessionId: string, owner: string, repo: string): void {
    this.approvedRequests.add(this.getKey(sessionId, '*', owner, repo))
  }

  isApproved(sessionId: string, request: PolicyRequest): boolean {
    const specific = this.getKey(sessionId, request.action, request.resource.owner, request.resource.repo)
    if (this.approvedRequests.has(specific)) return true

    const repoWide = this.getKey(sessionId, '*', request.resource.owner, request.resource.repo)
    if (this.approvedRequests.has(repoWide)) return true

    return false
  }

  private getKey(sessionId: string, action: string, owner: string, repo: string): string {
    return `${sessionId}:${action}:${owner}/${repo}`
  }
}
