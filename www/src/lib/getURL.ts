import canUseDOM from './canUseDOM'

export const getserverURL = () => {
    return (
        process.env.VITE_APP_SERVER ||
        (import.meta.env.VITE_APP_SERVER
            ? import.meta.env.VITE_APP_SERVER
            : 'http://localhost:3000')
    )
}

export const getclientURL = () => {
    if (canUseDOM) {
        const protocol = window.location.protocol
        const domain = window.location.hostname
        const port = window.location.port

        return `${protocol}//${domain}${port ? `:${port}` : ''}`
    }

    if (import.meta.env.VITE_APP_SERVER) {
        return `https://${import.meta.env.VITE_APP_SERVER}`
    }

    return process.env.VITE_APP_SERVER || ''
}