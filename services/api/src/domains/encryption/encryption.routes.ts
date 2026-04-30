import { Router } from 'express';
import { z } from 'zod';
import { encrypt, decrypt, isEncrypted } from '../../lib/encryption.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { audit } from '../../middleware/auditLog.js';
import { ok } from '../../lib/envelope.js';
import { BadRequestError } from '../../lib/errors.js';

/**
 * Encryption utility. Admin-only — used for ad-hoc encrypt/decrypt of PII
 * payloads in support / migration tooling. The repository layer does its own
 * encryption invisibly; this endpoint is a debug/admin surface.
 *
 * Spec: /directives/encryption.md.
 */
export const encryptionRouter = Router();

const encryptSchema = z.object({
  mode: z.enum(['encrypt', 'decrypt']),
  payload: z.string().min(1).max(100_000),
});

encryptionRouter.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validateBody(encryptSchema),
  audit('encryption.utility', () => 'system:encryption'),
  async (req, res) => {
    const { mode, payload } = req.body as z.infer<typeof encryptSchema>;
    if (mode === 'encrypt') {
      res.json(ok({ result: encrypt(payload) }));
      return;
    }
    if (!isEncrypted(payload)) {
      throw new BadRequestError('Payload is not in v1 encrypted format');
    }
    res.json(ok({ result: decrypt(payload) }));
  },
);
