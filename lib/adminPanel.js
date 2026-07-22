const sessions = new Map()
const TTL = 10 * 60 * 1000

function key(jid) {
    return String(jid || "").replace(/\D/g, "") || String(jid || "")
}

export function beginAdminPanel(owner, data = {}) {
    const session = { owner, ...data, createdAt: Date.now() }
    sessions.set(key(owner), session)
    return session
}

export function getAdminPanel(owner) {
    const session = sessions.get(key(owner))
    if (!session) return null
    if (Date.now() - session.createdAt > TTL) {
        sessions.delete(key(owner))
        return null
    }
    return session
}

export function updateAdminPanel(owner, patch) {
    const session = getAdminPanel(owner)
    if (!session) return null
    Object.assign(session, patch, { createdAt: Date.now() })
    return session
}

export function clearAdminPanel(owner) {
    sessions.delete(key(owner))
}

export default { beginAdminPanel, getAdminPanel, updateAdminPanel, clearAdminPanel }
