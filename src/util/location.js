/* @flow */

/**
 * 这个方法目的是处理一个RawLocation对象，对其进行标准化的转换
 * 1.首先定义一个next变量。
 * 2.判断raw是不是string  如果是string，next=>{path:raw} 如果不是 next =>raw
 * 3.判断next有没name属性或者_normalized属性  _normalized属性应该是判断是否被处理过的标志
 *   如果有name 或者 _normalized=true 直接返回next  表示这个next 不需要再处理了
 * 4.如果next没有path属性&&next.params存在且不为空&&current存在
 *   next=next的深拷贝，_normalized属性=true,并将next和current对象的参数对象拼成一个params对象
 *     如果current是命名路由的话，next.name = current.name next.params = params
 *     如果current的matched数组有内容的话，next.path = matched数组最后一项的path和params记性fillParams处理以后的path
 *     都不满足报错
 *    返回next
 * 5.如果不满足前面的情况，就会返回一个对象
 *  {
 *    _normalized:true,
 *    path:如果next.path在除去hash和query后还有值的话，返回一个resolvePath函数处理后的path，否则返回current.path(如果存在) || '/'
 *    query:next.path里面包含的query和next.query的组合
 *    hash:next.hash存在的话，返回next.hash否则去next.path里面的hash
 *  }
 * 
 * 6.assign(a,b)
 *   assign方法在处理a,b都具有的重复的key时，会采用b[key]的值
 */

import type VueRouter from '../index'
//resolvePath 解析文件路径，
//parsePath 解析url地址
import { parsePath, resolvePath } from './path'
//解析参数  返回参数的字典对象
import { resolveQuery } from './query'
//fillParams 将params和path规则进行结合，返回一个有效的路径
import { fillParams } from './params'
import { warn } from './warn'

export function normalizeLocation (
  raw: RawLocation,
  current: ?Route,
  append: ?boolean,
  router: ?VueRouter
): Location {
  let next: Location = typeof raw === 'string' ? { path: raw } : raw
  // named target  命名的目标
  //_normalized ?
  //相当于raw.name  raw,_normalized 应该是标志是否需要处理的标记
  if (next.name || next._normalized) {
    return next
  }

  // relative params  相关参数
  if (!next.path && next.params && current) {
    //赋值next对象  应该是为了修改next的时候，不会影响到raw
    next = assign({}, next)
    next._normalized = true
    //params是raw.params和current.params的组合
    const params: any = assign(assign({}, current.params), next.params)
    if (current.name) {
      next.name = current.name
      next.params = params
    } else if (current.matched.length) {
      const rawPath = current.matched[current.matched.length - 1].path  //匹配到的组件的最后一个
      next.path = fillParams(rawPath, params, `path ${current.path}`)
    } else if (process.env.NODE_ENV !== 'production') {
      //wran  相关参数的导航需要一个current route
      warn(false, `relative params navigation requires a current route.`)
    }
    return next
  }

  const parsedPath = parsePath(next.path || '')
  const basePath = (current && current.path) || '/'
  const path = parsedPath.path  //除去hash和query以后的path
    ? resolvePath(parsedPath.path, basePath, append || next.append)
    : basePath

  const query = resolveQuery(
    parsedPath.query,
    next.query,
    router && router.options.parseQuery
  )

  let hash = next.hash || parsedPath.hash
  if (hash && hash.charAt(0) !== '#') {
    hash = `#${hash}`
  }

  return {
    _normalized: true,
    path,
    query,
    hash
  }
}

//assign方法在处理重复的key时，会采用b的值
function assign (a, b) {
  for (const key in b) {
    a[key] = b[key]
  }
  return a
}
