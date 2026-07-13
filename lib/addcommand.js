const sessions = new Map()

export function createSession(sender, file) {
    sessions.set(sender, {
        file,

        expired: Date.now() + 300000
    })
}

export function getSession(sender) {
    const data = sessions.get(sender)

    if (!data) return null

    if (Date.now() > data.expired) {
        sessions.delete(sender)

        return null
    }

    return data
}

export function deleteSession(sender) {
    sessions.delete(sender)
}
