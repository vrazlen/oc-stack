
import { tool, json } from "@opencode-ai/plugin";

// --- HELPERS (Inlined to avoid bundler) ---

async function createStarterSet(transport, owner, repo, description) {
    // 1. Gitignore Template (Node)
    let gitignoreContent = "# Node.js\nnode_modules/\n.env\n";
    try {
        const tplReq = await transport.request({
            path: `/gitignore/templates/Node`,
            method: 'GET',
            authMode: 'none'
        });
        if (tplReq.ok) gitignoreContent = tplReq.data.source;
    } catch (e) {} // Fallback if fetch fails

    // 2. Blobs
    const readmeContent = `# ${repo}\n\n${description || 'A new repository.'}\n`;
    
    // Helper to create blob
    const createBlob = async (content) => {
        return transport.request({
            path: `/repos/${owner}/${repo}/git/blobs`,
            method: 'POST',
            body: { content, encoding: 'utf-8' },
            authMode: 'token'
        });
    };

    const readmeBlob = await createBlob(readmeContent);
    const gitignoreBlob = await createBlob(gitignoreContent);
    
    if (!readmeBlob.ok || !gitignoreBlob.ok) return { ok: false, error: "Blob creation failed" };

    // 3. Tree
    const treeParams = {
        tree: [
            { path: 'README.md', mode: '100644', type: 'blob', sha: readmeBlob.data.sha },
            { path: '.gitignore', mode: '100644', type: 'blob', sha: gitignoreBlob.data.sha }
        ]
    };
    
    const treeReq = await transport.request({
        path: `/repos/${owner}/${repo}/git/trees`,
        method: 'POST',
        body: treeParams,
        authMode: 'token'
    });
    if (!treeReq.ok) return { ok: false, error: "Tree creation failed" };

    // 4. Commit
    const commitReq = await transport.request({
        path: `/repos/${owner}/${repo}/git/commits`,
        method: 'POST',
        body: {
            message: 'Initial commit (Opencode)',
            tree: treeReq.data.sha,
            parents: []
        },
        authMode: 'token'
    });
    if (!commitReq.ok) return { ok: false, error: "Commit failed" };

    // 5. Ref
    return transport.request({
        path: `/repos/${owner}/${repo}/git/refs`,
        method: 'POST',
        body: {
            ref: 'refs/heads/main',
            sha: commitReq.data.sha
        },
        authMode: 'token'
    });
}

class AuthManager {
    constructor(config) { 
        this.token = null;
        // Prioritize Environment Variable
        if (typeof process !== 'undefined') {
            this.token = process.env.OPENCODE_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
        }
        // Fallback to config
        if (!this.token && config?.auth?.github_token) {
            this.token = config.auth.github_token;
        }
    }
    
    getHeaders() {
        return {
            "Authorization": `Bearer ${this.token}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Opencode-GitHub-Plugin"
        };
    }
}

// --- MAIN PLUGIN ---

export default async function plugin(context) {
    // 1. Sanity Check: Ensure Host provides Schema Factory
    if (!tool || !tool.schema) {
        throw new Error("FATAL: Host did not provide 'tool.schema'. Check @opencode-ai/plugin version.");
    }

    const auth = new AuthManager({}); // Config passed via env mostly

    // Transport Shim for helpers
    const transport = {
        request: async (opts) => {
            const headers = opts.authMode === 'none' ? {} : auth.getHeaders();
            const url = `https://api.github.com${opts.path}`;
            const fetchOpts = {
                method: opts.method,
                headers: { ...headers, "Content-Type": "application/json" }
            };
            if (opts.body) fetchOpts.body = JSON.stringify(opts.body);
            
            const res = await fetch(url, fetchOpts);
            const data = await res.json().catch(() => ({}));
            return { ok: res.ok, status: res.status, data };
        }
    };

    return {
        tool: {
            github_status: tool({
                description: "Check GitHub Plugin Status",
                args: {},
                execute: async () => {
                    return json({ 
                        ok: true, 
                        mode: "Clean Architecture (No Deps)", 
                        auth: auth.token ? "Configured" : "Missing" 
                    });
                }
            }),

            github_search: tool({
                description: "Search GitHub repositories",
                // [CRITICAL] Plain Shape. No z.object().
                args: {
                    query: tool.schema.string().describe("The search query")
                },
                execute: async (args) => {
                    if (!auth.token) return json({ ok: false, error: "Missing GITHUB_TOKEN" });
                    const res = await transport.request({
                        path: `/search/repositories?q=${encodeURIComponent(args.query)}`,
                        method: 'GET'
                    });
                    if (!res.ok) return json({ ok: false, error: `API Error: ${res.status}` });
                    
                    return json({
                        ok: true,
                        count: res.data.total_count,
                        repos: (res.data.items || []).slice(0, 5).map(r => ({ full: r.full_name, desc: r.description }))
                    });
                }
            }),

            github_repo_create: tool({
                description: "Create a new repository",
                // [CRITICAL] Plain Shape. No z.object().
                args: {
                    name: tool.schema.string().describe("Repository name"),
                    description: tool.schema.string().optional().describe("Description"),
                    private: tool.schema.boolean().default(true).describe("Is private?")
                },
                execute: async (args) => {
                    if (!auth.token) return json({ ok: false, error: "Missing GITHUB_TOKEN" });
                    
                    // 1. Create Repo
                    const createRes = await transport.request({
                        path: '/user/repos',
                        method: 'POST',
                        body: {
                            name: args.name,
                            description: args.description,
                            private: args.private,
                            auto_init: false // Forced false
                        }
                    });

                    if (!createRes.ok) return json({ ok: false, error: `Create Failed: ${JSON.stringify(createRes.data)}` });
                    
                    const repo = createRes.data;
                    
                    // 2. Init Starter Set
                    const initRes = await createStarterSet(transport, repo.owner.login, repo.name, args.description);
                    
                    return json({
                        ok: true,
                        repo_created: true,
                        initialized: initRes.ok,
                        html_url: repo.html_url,
                        warnings: initRes.ok ? [] : ["Failed to create README/gitignore"]
                    });
                }
            })
        }
    };
}
