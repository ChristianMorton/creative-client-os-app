export type Result = { ok: true } | { ok: false; error: string }

export type ResultWithId = { ok: true; id: string } | { ok: false; error: string }
