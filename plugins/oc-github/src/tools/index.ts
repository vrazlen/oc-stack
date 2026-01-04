import { tool, type ToolContext, type ToolDefinition } from '@opencode-ai/plugin'
import type { PolicyEngine } from '../core/policy.js'
import type { ApprovalManager } from '../core/approval.js'
import type { AuditLogger } from '../core/audit.js'
import type { GitHubTransport } from '../adapters/types.js'
import type { PolicyRequest } from '../core/types.js'

type Deps = {
  policyEngine: PolicyEngine
  approvalManager: ApprovalManager
  auditLogger: AuditLogger
  transport: GitHubTransport
}

type ToolResult = {
  ok: boolean
  data?: unknown
  error?: {
    code: string
    message: string
    reason?: string
  }
  decision?: {
    outcome: string
    reason: string
  }
}

function json(result: ToolResult): string {
  return JSON.stringify(result, null, 2)
}

function repoSlug(owner: string, repo: string): string {
  return `${owner}/${repo}`
}

function assertSafeWritePath(path: string): { ok: true } | { ok: false; reason: string } {
  if (path.startsWith('.github/workflows/')) {
    return { ok: false, reason: 'Modifying workflow files is forbidden by policy' }
  }
  return { ok: true }
}

async function guarded(
  deps: Deps,
  context: ToolContext,
  request: PolicyRequest,
  exec: () => Promise<unknown>
): Promise<string> {
  const decision = deps.policyEngine.evaluate(request, context.sessionID)

  if (decision.outcome === 'denied') {
    return json({
      ok: false,
      error: { code: 'NOT_ALLOWED', message: 'Access denied', reason: decision.reason },
      decision,
    })
  }

  if (decision.outcome === 'needs_approval') {
    return json({
      ok: false,
      error: {
        code: 'NEEDS_APPROVAL',
        message: `Approval required for write to ${repoSlug(request.resource.owner, request.resource.repo)}`,
        reason: decision.reason,
      },
      decision,
    })
  }

  const result = await exec()
  return json({ ok: true, data: result, decision })
}

export function createGitHubTools(deps: Deps): Record<string, ToolDefinition> {
  return {
    'github.search': tool({
      description: 'Search GitHub repositories/issues/code (read-only)',
      args: {
        query: tool.schema.string(),
        type: tool.schema.enum(['repositories', 'issues', 'code']).default('repositories'),
      },
      execute: async (args) => {
        const { query, type } = args
        const data = await deps.transport.request({
          path: `/search/${type}`,
          query: { q: query },
          authMode: 'token',
        })
        return json({ ok: true, data })
      },
    }),

    'github.issue.list': tool({
      description: 'List issues in a repository (read-only)',
      args: {
        owner: tool.schema.string(),
        repo: tool.schema.string(),
        state: tool.schema.enum(['open', 'closed', 'all']).default('open'),
      },
      execute: async (args) => {
        const data = await deps.transport.request({
          path: `/repos/${args.owner}/${args.repo}/issues`,
          query: { state: args.state },
          authMode: 'token',
        })
        return json({ ok: true, data })
      },
    }),

    'github.issue.create': tool({
      description: 'Create an issue (write; allowlist or per-session approval required)',
      args: {
        owner: tool.schema.string(),
        repo: tool.schema.string(),
        title: tool.schema.string(),
        body: tool.schema.string().optional(),
      },
      execute: async (args, context) => {
        const request: PolicyRequest = {
          action: 'issue.create',
          capability: 'write',
          resource: { owner: args.owner, repo: args.repo, type: 'issue' },
        }

        return await guarded(deps, context, request, async () => {
          return await deps.transport.request({
            path: `/repos/${args.owner}/${args.repo}/issues`,
            method: 'POST',
            body: { title: args.title, body: args.body },
            authMode: 'app',
          })
        })
      },
    }),

    'github.issue.comment': tool({
      description: 'Comment on an issue/PR (write; allowlist or per-session approval required)',
      args: {
        owner: tool.schema.string(),
        repo: tool.schema.string(),
        issue_number: tool.schema.number().int().positive(),
        body: tool.schema.string(),
      },
      execute: async (args, context) => {
        const request: PolicyRequest = {
          action: 'issue.comment',
          capability: 'write',
          resource: { owner: args.owner, repo: args.repo, type: 'issue' },
        }

        return await guarded(deps, context, request, async () => {
          return await deps.transport.request({
            path: `/repos/${args.owner}/${args.repo}/issues/${args.issue_number}/comments`,
            method: 'POST',
            body: { body: args.body },
            authMode: 'app',
          })
        })
      },
    }),

    'github.pr.list': tool({
      description: 'List pull requests in a repository (read-only)',
      args: {
        owner: tool.schema.string(),
        repo: tool.schema.string(),
        state: tool.schema.enum(['open', 'closed', 'all']).default('open'),
      },
      execute: async (args) => {
        const data = await deps.transport.request({
          path: `/repos/${args.owner}/${args.repo}/pulls`,
          query: { state: args.state },
          authMode: 'token',
        })
        return json({ ok: true, data })
      },
    }),

    'github.pr.create': tool({
      description: 'Create a pull request (write; allowlist or per-session approval required)',
      args: {
        owner: tool.schema.string(),
        repo: tool.schema.string(),
        title: tool.schema.string(),
        head: tool.schema.string(),
        base: tool.schema.string(),
        body: tool.schema.string().optional(),
      },
      execute: async (args, context) => {
        const request: PolicyRequest = {
          action: 'pr.create',
          capability: 'write',
          resource: { owner: args.owner, repo: args.repo, type: 'pr' },
        }

        return await guarded(deps, context, request, async () => {
          return await deps.transport.request({
            path: `/repos/${args.owner}/${args.repo}/pulls`,
            method: 'POST',
            body: {
              title: args.title,
              head: args.head,
              base: args.base,
              body: args.body,
            },
            authMode: 'app',
          })
        })
      },
    }),

    'github.repo.file.get': tool({
      description: 'Get file content from a repository (read-only)',
      args: {
        owner: tool.schema.string(),
        repo: tool.schema.string(),
        path: tool.schema.string(),
        ref: tool.schema.string().optional(),
      },
      execute: async (args) => {
        const data = await deps.transport.request({
          path: `/repos/${args.owner}/${args.repo}/contents/${args.path}`,
          query: { ref: args.ref },
          authMode: 'token',
        })
        return json({ ok: true, data })
      },
    }),

    'github.repo.file.put': tool({
      description:
        'Create/update a file via Contents API (write; allowlist or per-session approval required)',
      args: {
        owner: tool.schema.string(),
        repo: tool.schema.string(),
        path: tool.schema.string(),
        message: tool.schema.string(),
        content_base64: tool.schema.string(),
        sha: tool.schema.string().optional(),
        branch: tool.schema.string().optional(),
      },
      execute: async (args, context) => {
        const safe = assertSafeWritePath(args.path)
        if (!safe.ok) {
          return json({ ok: false, error: { code: 'NOT_ALLOWED', message: safe.reason } })
        }

        const request: PolicyRequest = {
          action: 'repo.file.put',
          capability: 'write',
          resource: { owner: args.owner, repo: args.repo, type: 'repo' },
        }

        return await guarded(deps, context, request, async () => {
          return await deps.transport.request({
            path: `/repos/${args.owner}/${args.repo}/contents/${args.path}`,
            method: 'PUT',
            body: {
              message: args.message,
              content: args.content_base64,
              sha: args.sha,
              branch: args.branch,
            },
            authMode: 'app',
          })
        })
      },
    }),

    'github.session.allow_repo': tool({
      description:
        'Allow write actions for a repository for the current session. Use ONLY after explicit user confirmation.',
      args: {
        owner: tool.schema.string(),
        repo: tool.schema.string(),
      },
      execute: async (args, context) => {
        deps.approvalManager.approveRepo(context.sessionID, args.owner, args.repo)
        return json({
          ok: true,
          data: {
            approved: true,
            repo: repoSlug(args.owner, args.repo),
            sessionID: context.sessionID,
          },
        })
      },
    }),
  }
}
