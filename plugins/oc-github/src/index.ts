import { z } from "zod";

const global_oc = (typeof globalThis !== 'undefined' ? globalThis : global) || {};
const opencode = (global_oc as any).opencode || {};
const tool = opencode.tool || ((opts: any) => opts);
const json = opencode.json || ((data: any) => data);

const GITHUB_API = "https://api.github.com";

function getToken(): string | null {
  if (typeof process !== 'undefined') {
    return process.env.OPENCODE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || null;
  }
  return null;
}

function getHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Opencode-GitHub-Plugin",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function githubRequest(path: string, options: { method?: string; body?: any } = {}): Promise<any> {
  const url = `${GITHUB_API}${path}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      ...getHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    return { ok: false, status: res.status, error: errorText };
  }
  
  const data = await res.json();
  return { ok: true, data };
}

function getDefaultGitignore(): string {
  return `# Dependencies
node_modules/
.pnp/
.pnp.js

# Build outputs
dist/
build/
out/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# Cache
.cache/
.turbo/
`;
}

async function createStarterSet(owner: string, repo: string, description?: string): Promise<{ ok: boolean; error?: string; commitSha?: string }> {
  const readmeContent = `# ${repo}\n\n${description || 'A new repository.'}\n`;
  const gitignoreContent = getDefaultGitignore();

  const readmeBlob = await githubRequest(`/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: { content: Buffer.from(readmeContent).toString('base64'), encoding: "base64" }
  });
  if (!readmeBlob.ok) return { ok: false, error: `Failed to create README blob: ${readmeBlob.error}` };

  const gitignoreBlob = await githubRequest(`/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: { content: Buffer.from(gitignoreContent).toString('base64'), encoding: "base64" }
  });
  if (!gitignoreBlob.ok) return { ok: false, error: `Failed to create .gitignore blob: ${gitignoreBlob.error}` };

  const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: {
      tree: [
        { path: "README.md", mode: "100644", type: "blob", sha: readmeBlob.data.sha },
        { path: ".gitignore", mode: "100644", type: "blob", sha: gitignoreBlob.data.sha }
      ]
    }
  });
  if (!tree.ok) return { ok: false, error: `Failed to create tree: ${tree.error}` };

  const commit = await githubRequest(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: { message: "Initial commit", tree: tree.data.sha, parents: [] }
  });
  if (!commit.ok) return { ok: false, error: `Failed to create commit: ${commit.error}` };

  const ref = await githubRequest(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: { ref: "refs/heads/main", sha: commit.data.sha }
  });
  if (!ref.ok) return { ok: false, error: `Failed to create ref: ${ref.error}` };

  return { ok: true, commitSha: commit.data.sha };
}

export default async function plugin(_input: any) {
  const token = getToken();

  const tools = {
    github_status: tool({
      description: "Check GitHub Plugin Status",
      args: z.object({}),
      execute: async () => {
        return json({
          ok: true,
          mode: "Integrated (fetch-based)",
          auth: token ? "Configured" : "Missing OPENCODE_GITHUB_TOKEN",
          tools: ["github_status", "github_search", "github_issue_list", "github_issue_create", "github_pr_list", "github_pr_create", "github_repo_file_get", "github_repo_file_put", "github_repo_create"]
        });
      }
    }),

    github_search: tool({
      description: "Search GitHub repositories/issues/code (read-only)",
      args: z.object({
        query: z.string().describe("The search query"),
        type: z.enum(["repositories", "issues", "code"]).default("repositories").describe("Type of search")
      }),
      execute: async (args: { query: string; type: string }) => {
        if (!token) return json({ ok: false, error: "Missing OPENCODE_GITHUB_TOKEN" });
        const q = encodeURIComponent(args.query);
        const result = await githubRequest(`/search/${args.type}?q=${q}`);
        if (!result.ok) return json(result);
        return json({
          ok: true,
          total_count: result.data.total_count,
          items: result.data.items?.slice(0, 10).map((item: any) => ({
            full_name: item.full_name || item.title,
            description: item.description || item.body?.slice(0, 100),
            html_url: item.html_url
          }))
        });
      }
    }),

    github_issue_list: tool({
      description: "List issues in a repository (read-only)",
      args: z.object({
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        state: z.enum(["open", "closed", "all"]).default("open").describe("Issue state filter")
      }),
      execute: async (args: { owner: string; repo: string; state: string }) => {
        if (!token) return json({ ok: false, error: "Missing OPENCODE_GITHUB_TOKEN" });
        const result = await githubRequest(`/repos/${args.owner}/${args.repo}/issues?state=${args.state}`);
        return json(result);
      }
    }),

    github_issue_create: tool({
      description: "Create an issue (write operation)",
      args: z.object({
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        title: z.string().describe("Issue title"),
        body: z.string().optional().describe("Issue body")
      }),
      execute: async (args: { owner: string; repo: string; title: string; body?: string }) => {
        if (!token) return json({ ok: false, error: "Missing OPENCODE_GITHUB_TOKEN" });
        const result = await githubRequest(`/repos/${args.owner}/${args.repo}/issues`, {
          method: "POST",
          body: { title: args.title, body: args.body }
        });
        return json(result);
      }
    }),

    github_pr_list: tool({
      description: "List pull requests in a repository (read-only)",
      args: z.object({
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        state: z.enum(["open", "closed", "all"]).default("open").describe("PR state filter")
      }),
      execute: async (args: { owner: string; repo: string; state: string }) => {
        if (!token) return json({ ok: false, error: "Missing OPENCODE_GITHUB_TOKEN" });
        const result = await githubRequest(`/repos/${args.owner}/${args.repo}/pulls?state=${args.state}`);
        return json(result);
      }
    }),

    github_pr_create: tool({
      description: "Create a pull request (write operation)",
      args: z.object({
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        title: z.string().describe("PR title"),
        head: z.string().describe("Branch containing changes"),
        base: z.string().describe("Branch to merge into"),
        body: z.string().optional().describe("PR description")
      }),
      execute: async (args: { owner: string; repo: string; title: string; head: string; base: string; body?: string }) => {
        if (!token) return json({ ok: false, error: "Missing OPENCODE_GITHUB_TOKEN" });
        const result = await githubRequest(`/repos/${args.owner}/${args.repo}/pulls`, {
          method: "POST",
          body: { title: args.title, head: args.head, base: args.base, body: args.body }
        });
        return json(result);
      }
    }),

    github_repo_file_get: tool({
      description: "Get file content from a repository (read-only)",
      args: z.object({
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        path: z.string().describe("File path"),
        ref: z.string().optional().describe("Branch/tag/commit ref")
      }),
      execute: async (args: { owner: string; repo: string; path: string; ref?: string }) => {
        if (!token) return json({ ok: false, error: "Missing OPENCODE_GITHUB_TOKEN" });
        const refParam = args.ref ? `?ref=${encodeURIComponent(args.ref)}` : "";
        const result = await githubRequest(`/repos/${args.owner}/${args.repo}/contents/${args.path}${refParam}`);
        return json(result);
      }
    }),

    github_repo_file_put: tool({
      description: "Create or update a file in a repository (write operation)",
      args: z.object({
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        path: z.string().describe("File path"),
        message: z.string().describe("Commit message"),
        content_base64: z.string().describe("Base64 encoded file content"),
        sha: z.string().optional().describe("SHA of file being replaced (required for updates)"),
        branch: z.string().optional().describe("Branch name")
      }),
      execute: async (args: { owner: string; repo: string; path: string; message: string; content_base64: string; sha?: string; branch?: string }) => {
        if (!token) return json({ ok: false, error: "Missing OPENCODE_GITHUB_TOKEN" });
        if (args.path.startsWith(".github/workflows")) {
          return json({ ok: false, error: "Writing to .github/workflows is forbidden for security" });
        }
        const result = await githubRequest(`/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
          method: "PUT",
          body: {
            message: args.message,
            content: args.content_base64,
            sha: args.sha,
            branch: args.branch
          }
        });
        return json(result);
      }
    }),

    github_repo_create: tool({
      description: "Create a new repository for the authenticated user with README and .gitignore",
      args: z.object({
        name: z.string().min(1).max(100).describe("Repository name"),
        description: z.string().optional().describe("Repository description"),
        private: z.boolean().default(true).describe("Whether the repo is private"),
        homepage: z.string().optional().describe("Homepage URL"),
        has_issues: z.boolean().default(true).describe("Enable issues"),
        has_projects: z.boolean().default(false).describe("Enable projects"),
        has_wiki: z.boolean().default(false).describe("Enable wiki")
      }),
      execute: async (args: { name: string; description?: string; private: boolean; homepage?: string; has_issues: boolean; has_projects: boolean; has_wiki: boolean }) => {
        if (!token) return json({ ok: false, error: "Missing OPENCODE_GITHUB_TOKEN" });

        const createResult = await githubRequest("/user/repos", {
          method: "POST",
          body: {
            name: args.name,
            description: args.description,
            private: args.private,
            homepage: args.homepage,
            has_issues: args.has_issues,
            has_projects: args.has_projects,
            has_wiki: args.has_wiki,
            auto_init: false
          }
        });

        if (!createResult.ok) {
          return json({ ok: false, error: `Failed to create repo: ${createResult.error}` });
        }

        const repoData = createResult.data;
        const owner = repoData.owner.login;
        const repo = repoData.name;

        const initResult = await createStarterSet(owner, repo, args.description);

        if (!initResult.ok) {
          return json({
            ok: true,
            data: repoData,
            warning: `Repository created but initialization failed: ${initResult.error}`
          });
        }

        return json({
          ok: true,
          data: {
            ...repoData,
            initialized: true,
            default_branch: "main"
          }
        });
      }
    })
  };

  return { tool: tools };
}
