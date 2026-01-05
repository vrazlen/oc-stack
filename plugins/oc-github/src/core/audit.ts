
import { AuditEntry, AuditConfig } from './types.js';

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private config: AuditConfig;

  constructor(config: AuditConfig) {
    this.config = config;
  }

  log(entry: AuditEntry): void {
    // Redact tokens in error message or other fields if necessary
    // For now, we assume 'action', 'actor', 'repo' are safe.
    // We should be careful with params in a real system.
    
    const safeEntry = {
        ...entry,
        // Rudimentary redaction if error contains tokens
        error: entry.error ? this.redact(entry.error) : undefined
    };

    this.entries.push(safeEntry);
    
    // In a production system, this would write to a JSONL file
    // console.log(JSON.stringify(safeEntry)); 
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  private redact(text: string): string {
    return text
      .replace(/(gh[pousr]_[a-zA-Z0-9]{36,})/g, '[REDACTED]')
      .replace(/(github_pat_[a-zA-Z0-9_]{20,})/g, '[REDACTED]');
  }
}
