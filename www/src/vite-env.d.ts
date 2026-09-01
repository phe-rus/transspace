/// <reference types="vite/client" />

declare global {
    namespace NodeJS {
        interface ProcessEnv extends Env { }
    }
}

declare global {
    interface ImportMetaEnv extends Env { }
}

export { }