// Vitest runs in plain Node, not inside Next's server bundle, so the real
// "server-only" package (which unconditionally throws) is aliased to this
// no-op for tests that exercise server-side modules directly.
export {};
