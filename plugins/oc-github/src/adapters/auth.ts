
export class AuthManager {
  config: any;
  cachedInstallationToken: any = null;
  constructor(config: any) { this.config = config; }
  getBaseUrl() { return this.config.baseUrl ?? "https://api.github.com"; }
  getTokenForRead() {
    if (this.config.githubToken) return { token: this.config.githubToken, type: "token" };
    return { type: "none" };
  }
  async getInstallationToken() {
    throw new Error("GitHub Apps (JWT) disabled. Please use a Personal Access Token (PAT).");
  }
}
