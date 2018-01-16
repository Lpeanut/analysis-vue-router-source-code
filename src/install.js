import View from './components/view'
import Link from './components/link'

export let _Vue

export function install (Vue) {
  if (install.installed && _Vue === Vue) return
  install.installed = true
  //引用Vue，同时又避免Vue作为一个依赖打包、
  _Vue = Vue
  //检查是否有定义
  const isDef = v => v !== undefined

  const registerInstance = (vm, callVal) => {
    // 存在至少一个 VueComponent 时, _parentVnode 属性才存在
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      //注册路由实例
      i(vm, callVal)
    }
  }

  Vue.mixin({
    beforeCreate () {
      //判断是否注册了router
      if (isDef(this.$options.router)) {
        // router的根组件指向Vue实例
        this._routerRoot = this
        this._router = this.$options.router
        //router初始化
        this._router.init(this)
        //定义响应式的 _route对象
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 确保 this._routerRoot 有值
        // 用于查找 router-view 组件的层次判断
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      // 注册 VueComponent，进行 observer 处理
      registerInstance(this, this)
    },
    destroyed () {
      // 取消 VueComponent 的注册
      registerInstance(this)
    }
  })

  //定义了$router和$route的 getter
  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })

  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })
  //注册 rout-link  和 router-view
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies    // optionMergeStrategies 选择合并策略
  // use the same hook merging strategy for route hooks
  // 对路由钩子使用相同的钩子合并策略
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
