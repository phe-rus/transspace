// spec 0001 key invariants: the one seam every private, session scoped
// read goes through. Decoy shaping happens here, once, never as a per
// endpoint check that could be missed. `decoy` is a plain value, not a
// thunk: a decoy session must never even reach the database for its real
// data, since the point is that a coerced unlock can't leak whether real
// data exists at all.
export async function readPrivate<T>(
    session: { isDecoy: boolean },
    real: () => Promise<T>,
    decoy: T
): Promise<T> {
    if (session.isDecoy) return decoy
    return real()
}

// spec 0001 AC-6, Security model: a decoy session can never write
// anything real (profile edits, account deletion). Every private write
// endpoint calls this first.
export function assertNotDecoy(session: { isDecoy: boolean }): void {
    if (session.isDecoy) {
        throw new Response("Forbidden", { status: 403 })
    }
}
