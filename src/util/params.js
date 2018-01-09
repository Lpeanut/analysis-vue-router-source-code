/* @flow */

/**
 * 1. 使用path-to-regexp插件
 * 2. 定义一个空对象，用来存放Regexp.compile(path),暂时理解为存放一个匹配规则，这个匹配规则可能会出现
 *    重复调用的情况，所以在创建的时候，判断一下，如果有这个规则，就不会再创建这个规则，而是直接使用
 * 3. fillParams(path,params,routeMsg)，填充参数，将参数中的params和path规则进行结合，返回一个有效的路径。
 */

import { warn } from './warn'
import Regexp from 'path-to-regexp'

// $flow-disable-line    //禁用线流
//正则表达式编译缓存
const regexpCompileCache: {
  [key: string]: Function
} = Object.create(null)

//填充参数  params不一定存在
//推测这里的path 应该是定义路由时候写路由匹配规则的path
//params来源暂时不明
export function fillParams (
  path: string,
  params: ?Object,
  routeMsg: string
): string {
  // Regexp只适用于字符串，非字符串情况下会报错，而且在某些匹配规则下，匹配错误也会报错
  // 所以这个地方需要try一下
  try {
    const filler =
      regexpCompileCache[path] ||
      (regexpCompileCache[path] = Regexp.compile(path))
    //  Regexp.compile(path)返回一个函数，函数的参数传一个对象
    //  例子 var toPath = pathToRegexp.compile('/user/:id')
    //  toPath({ id: 123 }) //=> "/user/123"
    return filler(params || {}, { pretty: true })
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      warn(false, `missing param for ${routeMsg}: ${e.message}`)
    }
    return ''
  }
}
