/* @flow */

/**
 * 1.createRoute  创建路由
 *  //1.定义一个route对象，包含name、meta、path、hash、query、params、fullPath、matched(循环查询parent)
 *  //2.如果有重定向属性，route中添加redirectedFrom
 *  //3.对路由对象进行浅冻结
 * 
 * 2.START 定义初始路由 START = { path: / }
 * 
 * 3.isSameRoute  判断是否是同一个路由
 *  //判断是否是同一个路由
    //1.如果 b路由 === START初始路由，判断a===b\
    //2.如果 b路由不存在，直接返回false
    //3.如果 a和b的路由都有path，判断去除尾部'/'以后的path、query、hash是否都相等
    //4.如果 如果都有name属性，判断name、hash、query和params是否相等
    //以上条件如果都不满足，return false
    
 * 4.isIncludedRoute  判断路由包含关系
    //1:路由path去尾部，目标路由path包含在当前路由内
    //2:目标路由的hash值不存在，或者两者的hash相等
    //3.目标路由全部query的key都包含在当前路由query里
 */

import type VueRouter from '../index'
//默认stringifyQuery取得是router.options.stringifyQuery  这里引入的stringifyQuery目的是前者的 备用函数
import { stringifyQuery } from './query'

//匹配尾部的'/'
const trailingSlashRE = /\/?$/

//创建路由
export function createRoute (
  record: ?RouteRecord,
  location: Location,
  redirectedFrom?: ?Location,
  router?: VueRouter
): Route {
  //stringifyQuery取router中的stringifyQuery方法
  const stringifyQuery = router && router.options.stringifyQuery
  //克隆参数
  let query: any = location.query || {}
  try {
    query = clone(query)
  } catch (e) {}
  const route: Route = {
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || '/',
    hash: location.hash || '',
    query,
    params: location.params || {},
    fullPath: getFullPath(location, stringifyQuery),
    matched: record ? formatMatch(record) : []  //white循环查询match对象
  }
  //如果存在重定向，在路由上加入重定向路径
  if (redirectedFrom) {
    route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
  }
  //冻结路由对象，但不是深度冻结
  return Object.freeze(route)
}

//克隆函数   如果是数组或对象，执行回调  如果非数组和对象，直接返回该值
function clone (value) {
  if (Array.isArray(value)) {
    return value.map(clone)
  } else if (value && typeof value === 'object') {
    const res = {}
    for (const key in value) {
      res[key] = clone(value[key])
    }
    return res
  } else {
    return value
  }
}

//START 表示 初始状态的起始路由
// the starting route that represents the initial state
export const START = createRoute(null, {
  path: '/'
})

// 返回一个match list 通过一个while循环，上溯RouteRecord的父路由
function formatMatch (record: ?RouteRecord): Array<RouteRecord> {
  const res = []
  while (record) {
    res.unshift(record)
    record = record.parent
  }
  return res
}

//返回一个将path+参数+哈希path组合在一起的fullPath路径
function getFullPath (
  { path, query = {}, hash = '' },
  _stringifyQuery
): string {
  const stringify = _stringifyQuery || stringifyQuery
  return (path || '/') + stringify(query) + hash
}

//判断是否是同一个路由
//1.如果 b路由 === START初始路由，判断a===b\
//2.如果 b路由不存在，直接返回false
//3.如果 a和b的路由都有path，判断去除尾部'/'以后的path、query、hash是否都相等
//4.如果 如果都有name属性，判断name、hash、query和params是否相等
//以上条件如果都不满足，return false
export function isSameRoute (a: Route, b: ?Route): boolean {
  if (b === START) {
    return a === b
  } else if (!b) {
    return false
  } else if (a.path && b.path) {
    return (
      a.path.replace(trailingSlashRE, '') === b.path.replace(trailingSlashRE, '') &&
      a.hash === b.hash &&
      isObjectEqual(a.query, b.query)
    )
  } else if (a.name && b.name) {
    return (
      a.name === b.name &&
      a.hash === b.hash &&
      isObjectEqual(a.query, b.query) &&
      isObjectEqual(a.params, b.params)
    )
  } else {
    return false
  }
}

//判断两个对象是否相等 如果属性都是object 递归调用
function isObjectEqual (a = {}, b = {}): boolean {
  // handle null value #1566
  if (!a || !b) return a === b
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  return aKeys.every(key => {
    const aVal = a[key]
    const bVal = b[key]
    // check nested equality
    if (typeof aVal === 'object' && typeof bVal === 'object') {
      return isObjectEqual(aVal, bVal)
    }
    return String(aVal) === String(bVal)
  })
}

//判断路由包含关系
//1:路由path去尾部，目标路由path包含在当前路由内
//2:目标路由的hash值不存在，或者两者的hash相等
//3.目标路由全部query的key都包含在当前路由query里
export function isIncludedRoute (current: Route, target: Route): boolean {
  return (
    current.path.replace(trailingSlashRE, '/').indexOf(
      target.path.replace(trailingSlashRE, '/')
    ) === 0 &&
    (!target.hash || current.hash === target.hash) &&
    queryIncludes(current.query, target.query)
  )
}

function queryIncludes (current: Dictionary<string>, target: Dictionary<string>): boolean {
  for (const key in target) {
    if (!(key in current)) {
      return false
    }
  }
  return true
}
