/* @flow */

import { _Vue } from '../install'
import { warn, isError } from './warn'

export function resolveAsyncComponents (matched: Array<RouteRecord>): Function {
  return (to, from, next) => {
    let hasAsync = false
    let pending = 0
    let error = null

    flatMapComponents(matched, (def, _, match, key) => {
      // if it's a function and doesn't have cid attached,  如果它是一个没有附加cid的函数，
      // assume it's an async component resolve function. 假定它是一个解析异步组件的函数。
      // we are not using Vue's default async resolving mechanism because 我们不使用Vue默认的异步组件处理机制
      // we want to halt the navigation until the incoming component has been 因为在这个传入的组件被解析之前，我们希望停止导航
      // resolved.
      
      if (typeof def === 'function' && def.cid === undefined) {
        hasAsync = true
        pending++

        //resolvedDef 是一个对象
        const resolve = once(resolvedDef => {
          if (isESModule(resolvedDef)) {
            resolvedDef = resolvedDef.default
          }
          // save resolved on async factory in case it's used elsewhere
          // 保存异步工厂解析的结果，防止它用在了别的地方

          // 如果组件有default的话，def.resolved 就等于 default 方法
          // otherwise 使用Vue.extend创建一个子类
          def.resolved = typeof resolvedDef === 'function'
            ? resolvedDef
            : _Vue.extend(resolvedDef)
          // ？
          match.components[key] = resolvedDef
          pending--
          if (pending <= 0) {
            next()
          }
        })
        //报错
        const reject = once(reason => {
          const msg = `Failed to resolve async component ${key}: ${reason}`
          process.env.NODE_ENV !== 'production' && warn(false, msg)
          if (!error) {
            error = isError(reason)
              ? reason
              : new Error(msg)
            next(error)
          }
        })

        let res
        try {
          res = def(resolve, reject)
        } catch (e) {
          reject(e)
        }
        if (res) {
          if (typeof res.then === 'function') {
            res.then(resolve, reject)
          } else {
            // new syntax in Vue 2.3
            const comp = res.component
            if (comp && typeof comp.then === 'function') {
              comp.then(resolve, reject)
            }
          }
        }
      }
    })

    if (!hasAsync) next()
  }
}

export function flatMapComponents (
  matched: Array<RouteRecord>,
  fn: Function
): Array<?Function> {
  return flatten(matched.map(m => {
    return Object.keys(m.components).map(key => fn(
      m.components[key],
      m.instances[key],
      m, key
    ))
  }))
}

export function flatten (arr: Array<any>): Array<any> {
  return Array.prototype.concat.apply([], arr)
}

const hasSymbol =
  typeof Symbol === 'function' &&
  typeof Symbol.toStringTag === 'symbol'

function isESModule (obj) {
  return obj.__esModule || (hasSymbol && obj[Symbol.toStringTag] === 'Module')
}

// in Webpack 2, require.ensure now also returns a Promise
// so the resolve/reject functions may get called an extra time
// if the user uses an arrow function shorthand that happens to
// return that Promise.
function once (fn) {
  let called = false
  return function (...args) {
    if (called) return
    called = true
    return fn.apply(this, args)
  }
}
