const isDev = import.meta.env.DEV
export const log = isDev ? console.log.bind(console, '[PropVault]') : () => {}
export const logError = isDev ? console.error.bind(console, '[PropVault]') : () => {}
