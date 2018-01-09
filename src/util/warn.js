/* @flow */

/**
 * 推测设置condition的目的是适应不同的应用场景，
 * 在肯定报错的情况下，直接传入固定的false
 * 在不确定是否需要报错的情况下，传入一个随动的Boolean，控制是否需要报错
 */


/**
 *  声明错误（红色字体）
 *  传入一个约束条件 和一个需要显示的错误信息
 */

export function assert (condition: any, message: string) {
  if (!condition) {
    throw new Error(`[vue-router] ${message}`)
  }
}

/**
 * 警告（黄色字体）
 * 传入约束条件 和 错误提示信息
 * 如果不是在生产环境并且 条件=false 同时满足 在浏览器环境下，提示警告
 */

export function warn (condition: any, message: string) {
  if (process.env.NODE_ENV !== 'production' && !condition) {
    typeof console !== 'undefined' && console.warn(`[vue-router] ${message}`)
  }
}

/**
 * Analysis
 * 检查是否有错误  传入err错误信息  返回布尔值
 * 返回传入的信息中是否有Error字符串
 */

export function isError (err: any): boolean {
  return Object.prototype.toString.call(err).indexOf('Error') > -1
}
