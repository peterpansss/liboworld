/**
 * Coverage for src/lib/supabase.ts and the infra re-export at
 * src/lib/infra/supabase.ts.
 *
 * The module hard-codes the project URL and the public anon key (this is a
 * publishable key, not a secret), so there is no env-var branch to test.
 * We assert:
 *   - the singleton-ish factory call produces a usable client
 *   - both the direct path and the infra/ re-export return the SAME instance
 *     (importing twice must not create two clients)
 *   - the client exposes the methods the rest of the app relies on
 */
import { describe, expect, it } from 'vitest';
import { supabase } from '../../src/lib/supabase';
import { supabase as supabaseInfra } from '../../src/lib/infra/supabase';

describe('supabase client singleton', () => {
  it('exposes the standard SupabaseClient surface', () => {
    expect(supabase).toBeTruthy();
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.auth).toBe('object');
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.rpc).toBe('function');
    expect(typeof supabase.storage).toBe('object');
  });

  it('is the same instance regardless of import path (no duplicate clients)', () => {
    expect(supabaseInfra).toBe(supabase);
  });

  it('returns a query builder from .from()', () => {
    const q = supabase.from('users');
    // PostgrestQueryBuilder exposes select/insert/update/delete/upsert
    expect(typeof q.select).toBe('function');
    expect(typeof q.insert).toBe('function');
    expect(typeof q.update).toBe('function');
    expect(typeof q.delete).toBe('function');
    expect(typeof q.upsert).toBe('function');
  });
});
