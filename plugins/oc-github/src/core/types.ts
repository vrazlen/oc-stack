export type DecisionOutcome = 'allowed' | 'denied' | 'needs_approval';

export type GitHubResourceType = 'repo' | 'issue' | 'pr';

export type GitHubResource = {
  owner: string;
  repo: string;
  type: GitHubResourceType;
};

export type Capability = 'read' | 'write';

export type PolicyRequest = {
  action: string;
  capability: Capability;
  resource: GitHubResource;
};

export type AccessDecision = {
  outcome: DecisionOutcome;
  reason: string;
};

export type PolicyConfig = {
  allowlist: string[];
  denylist: string[];
  mode: 'fail_closed' | 'monitor';
};

export type AuthConfig = {
  baseUrl?: string;
  appId?: string;
  installationId?: string;
  privateKey?: string;
  privateKeyPath?: string;
  githubToken?: string;
};

export type AuditConfig = {
  enabled: boolean;
  directory?: string;
};

export type PluginConfig = {
  policy: PolicyConfig;
  auth: AuthConfig;
  audit: AuditConfig;
};

export type AuditEntry = {
  timestamp: string;
  sessionId: string;
  action: string;
  actor: string;
  repo: string;
  backend: string;
  decision: DecisionOutcome;
  outcome: 'success' | 'failure';
  durationMs: number;
  error?: string;
};
