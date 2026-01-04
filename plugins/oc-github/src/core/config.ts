import { z } from 'zod'
import type { PluginConfig } from './types.js'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import yaml from 'js-yaml'

const PolicySchema = z.object({
  allowlist: z.array(z.string()).default([]),
  denylist: z.array(z.string()).default([]),
  mode: z.enum(['fail_closed', 'monitor']).default('fail_closed'),
})

const AuthSchema = z.object({
  baseUrl: z.string().url().optional(),
  appId: z.string().optional(),
  installationId: z.string().optional(),
  privateKey: z.string().optional(),
  privateKeyPath: z.string().optional(),
  githubToken: z.string().optional(),
})

const AuditSchema = z.object({
  enabled: z.boolean().default(true),
  directory: z.string().optional(),
})

const ConfigSchema = z.object({
  policy: PolicySchema.default({}),
  auth: AuthSchema.default({}),
  audit: AuditSchema.default({}),
})

type ConfigManagerOptions = {
  worktree?: string
}

function normalizeConfig(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return {}
  const record = raw as Record<string, unknown>

  if (record.policy || record.auth || record.audit) return record

  const looksLikePolicy =
    'allowlist' in record || 'denylist' in record || 'mode' in record

  if (looksLikePolicy) {
    const { allowlist, denylist, mode, ...rest } = record
    return {
      ...rest,
      policy: {
        allowlist,
        denylist,
        mode,
      },
    }
  }

  return record
}

async function maybeReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return null
  }
}

export class ConfigManager {
  private readonly worktree?: string

  constructor(options: ConfigManagerOptions = {}) {
    this.worktree = options.worktree
  }

  async load(): Promise<PluginConfig> {
    const candidateDirs = [
      this.worktree,
      process.cwd(),
      join(homedir(), '.config', 'opencode'),
    ].filter(Boolean) as string[]

    const candidatePaths: string[] = []
    for (const dir of candidateDirs) {
      candidatePaths.push(join(dir, '.opencode', 'github-policy.yaml'))
      candidatePaths.push(join(dir, '.opencode', 'github-policy.yml'))
      candidatePaths.push(join(dir, '.opencode', 'github-policy.json'))
      candidatePaths.push(join(dir, 'github-policy.yaml'))
      candidatePaths.push(join(dir, 'github-policy.yml'))
      candidatePaths.push(join(dir, 'github-policy.json'))
    }

    for (const filePath of candidatePaths) {
      const content = await maybeReadFile(filePath)
      if (!content) continue

      const parsed = this.parseFile(filePath, content)
      const normalized = normalizeConfig(parsed)

      const config = ConfigSchema.safeParse(normalized)
      if (!config.success) continue

      const withKey = await this.hydratePrivateKey(config.data)
      return withKey
    }

    return await this.hydratePrivateKey(
      ConfigSchema.parse({ policy: { allowlist: [], denylist: [], mode: 'fail_closed' }, auth: {}, audit: {} })
    )
  }

  private parseFile(filePath: string, content: string): unknown {
    if (filePath.endsWith('.json')) {
      return JSON.parse(content)
    }
    return yaml.load(content)
  }

  private async hydratePrivateKey(config: z.infer<typeof ConfigSchema>): Promise<PluginConfig> {
    const privateKey = config.auth.privateKey
    const privateKeyPath = config.auth.privateKeyPath

    if (!privateKey && privateKeyPath) {
      const content = await maybeReadFile(privateKeyPath)
      if (content) {
        return {
          ...config,
          auth: {
            ...config.auth,
            privateKey: content,
          },
        }
      }
    }

    return config
  }
}
