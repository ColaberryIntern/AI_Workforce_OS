import { describe, it, expect } from '@jest/globals';
import { ok, fail } from '../../src/lib/envelope.js';

describe('envelope', () => {
  it('ok() wraps data', () => {
    expect(ok({ x: 1 })).toEqual({ data: { x: 1 } });
  });

  it('ok() includes meta when provided', () => {
    expect(ok([1, 2, 3], { count: 3 })).toEqual({ data: [1, 2, 3], meta: { count: 3 } });
  });

  it('fail() builds an error envelope', () => {
    expect(fail('BAD', 'oops')).toEqual({ error: { code: 'BAD', message: 'oops' } });
  });

  it('fail() includes details when provided', () => {
    expect(fail('VAL', 'bad', { field: 'name' })).toEqual({
      error: { code: 'VAL', message: 'bad', details: { field: 'name' } },
    });
  });
});
