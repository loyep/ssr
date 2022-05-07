import { Store } from 'vuex'
import { Route } from 'vue-router'
import { ISSRMidwayKoaContext } from 'ssr-types'

interface Params {
  store: Store<any>
  router: Route
}

export default async ({ store, router }: Params, ctx?: ISSRMidwayKoaContext) => {

}
