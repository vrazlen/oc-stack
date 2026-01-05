
import { z, ZodType } from "zod";

// [CRITICAL PATCH]
// Redirect 'schema._zod.def' to 'schema._def'
// This tricks the Host (Zod v4) into accepting our Zod v3 schemas.
if (ZodType && !('def' in (ZodType.prototype as any))) {
  Object.defineProperty(ZodType.prototype, "_zod", {
    get() {
      return { def: this._def };
    },
    configurable: true
  });
}

export { z };
