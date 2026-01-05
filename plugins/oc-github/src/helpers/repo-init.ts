import type { GitHubTransport } from '../adapters/types.js'
import { fetchGitignoreTemplate, getDefaultGitignore } from './gitignore.js'

export interface StarterFile {
  path: string
  content: string
}

export interface InitialCommitOptions {
  owner: string
  repo: string
  branch: string
  message: string
  files: StarterFile[]
}

export interface InitialCommitResult {
  ok: boolean
  commitSha?: string
  error?: string
}

interface BlobResponse {
  sha: string
  url: string
}

interface TreeEntry {
  path: string
  mode: '100644' | '100755' | '040000' | '160000' | '120000'
  type: 'blob' | 'tree' | 'commit'
  sha: string
}

interface TreeResponse {
  sha: string
  url: string
  tree: TreeEntry[]
}

interface CommitResponse {
  sha: string
  url: string
  message: string
}

interface RefResponse {
  ref: string
  url: string
  object: {
    sha: string
    type: string
    url: string
  }
}

async function createBlob(
  transport: GitHubTransport,
  owner: string,
  repo: string,
  content: string
): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  const result = await transport.request({
    path: `/repos/${owner}/${repo}/git/blobs`,
    method: 'POST',
    body: {
      content,
      encoding: 'utf-8',
    },
    authMode: 'token',
  })

  if (!result.ok) {
    return { ok: false, error: `Failed to create blob: ${result.error || result.status}` }
  }

  const data = result.data as BlobResponse
  return { ok: true, sha: data.sha }
}

async function createTree(
  transport: GitHubTransport,
  owner: string,
  repo: string,
  entries: TreeEntry[]
): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  const result = await transport.request({
    path: `/repos/${owner}/${repo}/git/trees`,
    method: 'POST',
    body: {
      tree: entries,
    },
    authMode: 'token',
  })

  if (!result.ok) {
    return { ok: false, error: `Failed to create tree: ${result.error || result.status}` }
  }

  const data = result.data as TreeResponse
  return { ok: true, sha: data.sha }
}

async function createCommit(
  transport: GitHubTransport,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parents: string[]
): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  const result = await transport.request({
    path: `/repos/${owner}/${repo}/git/commits`,
    method: 'POST',
    body: {
      message,
      tree: treeSha,
      parents,
    },
    authMode: 'token',
  })

  if (!result.ok) {
    return { ok: false, error: `Failed to create commit: ${result.error || result.status}` }
  }

  const data = result.data as CommitResponse
  return { ok: true, sha: data.sha }
}

async function createRef(
  transport: GitHubTransport,
  owner: string,
  repo: string,
  ref: string,
  sha: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await transport.request({
    path: `/repos/${owner}/${repo}/git/refs`,
    method: 'POST',
    body: {
      ref,
      sha,
    },
    authMode: 'token',
  })

  if (!result.ok) {
    return { ok: false, error: `Failed to create ref: ${result.error || result.status}` }
  }

  return { ok: true }
}

export async function createInitialCommit(
  transport: GitHubTransport,
  options: InitialCommitOptions
): Promise<InitialCommitResult> {
  const { owner, repo, branch, message, files } = options

  const treeEntries: TreeEntry[] = []

  for (const file of files) {
    const blobResult = await createBlob(transport, owner, repo, file.content)
    if (!blobResult.ok) {
      return { ok: false, error: blobResult.error }
    }

    treeEntries.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobResult.sha,
    })
  }

  const treeResult = await createTree(transport, owner, repo, treeEntries)
  if (!treeResult.ok) {
    return { ok: false, error: treeResult.error }
  }

  const commitResult = await createCommit(transport, owner, repo, message, treeResult.sha, [])
  if (!commitResult.ok) {
    return { ok: false, error: commitResult.error }
  }

  const refResult = await createRef(transport, owner, repo, `refs/heads/${branch}`, commitResult.sha)
  if (!refResult.ok) {
    return { ok: false, error: refResult.error }
  }

  return { ok: true, commitSha: commitResult.sha }
}

export async function createStarterSet(
  transport: GitHubTransport,
  owner: string,
  repo: string,
  description?: string,
  gitignoreTemplate?: string
): Promise<InitialCommitResult> {
  const readmeContent = `# ${repo}

${description || 'A new repository.'}
`

  let gitignoreContent: string
  if (gitignoreTemplate) {
    const templateResult = await fetchGitignoreTemplate(transport, gitignoreTemplate)
    gitignoreContent = templateResult.ok && templateResult.source ? templateResult.source : getDefaultGitignore()
  } else {
    gitignoreContent = getDefaultGitignore()
  }

  const files: StarterFile[] = [
    { path: 'README.md', content: readmeContent },
    { path: '.gitignore', content: gitignoreContent },
  ]

  return createInitialCommit(transport, {
    owner,
    repo,
    branch: 'main',
    message: 'Initial commit',
    files,
  })
}
