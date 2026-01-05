import type { GitHubTransport } from '../adapters/types.js'

export interface GitignoreTemplateResult {
  ok: boolean
  source?: string
  error?: string
}

export async function fetchGitignoreTemplate(
  transport: GitHubTransport,
  templateName: string
): Promise<GitignoreTemplateResult> {
  const result = await transport.request({
    path: `/gitignore/templates/${encodeURIComponent(templateName)}`,
    method: 'GET',
    authMode: 'none',
  })

  if (!result.ok) {
    return {
      ok: false,
      error: `Failed to fetch gitignore template '${templateName}': ${result.error || result.status}`,
    }
  }

  const data = result.data as { name: string; source: string }
  return {
    ok: true,
    source: data.source,
  }
}

export function getDefaultGitignore(): string {
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
`
}
