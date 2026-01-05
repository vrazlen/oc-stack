import { createStarterSet } from '../helpers/repo-init.js'

export function createGitHubTools(deps: Deps): Record<string, ToolDefinition> {
  return {
    github_search: tool({
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

    github_issue_list: tool({
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

    github_issue_create: tool({
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

    github_issue_comment: tool({
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

    github_pr_list: tool({
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

    github_pr_create: tool({
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

    github_repo_file_get: tool({
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

    github_repo_file_put: tool({
      description: 'Create/update a file via Contents API (write; allowlist or per-session approval required)',
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

    github_session_allow_repo: tool({
      description: 'Allow write actions for a repository for the current session. Use ONLY after explicit user confirmation.',
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

    github_repo_create: tool({
      description: 'Create a new repository for the authenticated user (write; requires approval). Creates with README.md and .gitignore starter files.',
      args: {
        name: tool.schema.string().min(1).max(100),
        description: tool.schema.string().optional(),
        private: tool.schema.boolean().default(true),
        homepage: tool.schema.string().optional(),
        has_issues: tool.schema.boolean().default(true),
        has_projects: tool.schema.boolean().default(false),
        has_wiki: tool.schema.boolean().default(false),
        gitignore_template: tool.schema.string().optional(),
      },
      execute: async (args, context) => {
        const request: PolicyRequest = {
          action: 'repo.create',
          capability: 'write',
          resource: { owner: 'user', repo: args.name, type: 'repo' },
        }

        return await guarded(deps, context, request, async () => {
          const createResult = await deps.transport.request({
            path: '/user/repos',
            method: 'POST',
            body: {
              name: args.name,
              description: args.description,
              private: args.private,
              homepage: args.homepage,
              has_issues: args.has_issues,
              has_projects: args.has_projects,
              has_wiki: args.has_wiki,
              auto_init: false,
            },
            authMode: 'token',
          })

          if (!createResult.ok) {
            return createResult
          }

          const repoData = createResult.data as { owner: { login: string }; name: string; html_url: string }
          const owner = repoData.owner.login
          const repo = repoData.name

          const initResult = await createStarterSet(
            deps.transport,
            owner,
            repo,
            args.description,
            args.gitignore_template
          )

          if (!initResult.ok) {
            return json({
              ok: true,
              data: repoData,
              warning: `Repository created but initialization failed: ${initResult.error}`,
            })
          }

          return json({
            ok: true,
            data: {
              ...repoData,
              initialized: true,
              default_branch: 'main',
            },
          })
        })
      },
    }),
  }
}

