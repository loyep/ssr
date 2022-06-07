
interface IWindow {
  __USE_SSR__?: boolean
  __INITIAL_DATA__?: any
  __INITIAL_PINIA_DATA__?: any
  STORE_CONTEXT?: any
  __USE_VITE__?: boolean
  prefix?: string
  clientPrefix?: string
  microApp?: any
  hashRouter: boolean
}

declare global {
  interface Window extends IWindow {}
  const __VUE_PROD_DEVTOOLS__: boolean
  const __isBrowser__: Boolean
}


declare module '*.less'

export {}