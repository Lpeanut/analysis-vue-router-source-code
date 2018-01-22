/* @flow */

import { inBrowser } from './dom'
import { saveScrollPosition } from './scroll'

export const supportsPushState = inBrowser && (function () {
  const ua = window.navigator.userAgent
  //安卓2.x或者安卓4.0的window Phone手机（同时不是safari和chrome） 返回false  表示不支持pushState （此做法推测是因为window.history会报错）
  if (
    (ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
    ua.indexOf('Mobile Safari') !== -1 &&
    ua.indexOf('Chrome') === -1 &&
    ua.indexOf('Windows Phone') === -1
  ) {
    return false
  }

  return window.history && 'pushState' in window.history
})()

//使用User Timeing API（如果存在） 来达到更精准
// use User Timing api (if present) for more accurate key precision
const Time = inBrowser && window.performance && window.performance.now
  ? window.performance
  : Date

//得到秒数
let _key: string = genKey()

//获取当前时间
function genKey (): string {
  return Time.now().toFixed(3)
}

//拿到两个读写State的时间
export function getStateKey () {
  return _key
}

export function setStateKey (key: string) {
  _key = key
}

//pushState函数中，将histroy 的pushState 和replaceState 合到了一起，
//推测原因是  因为这两种操作都需要进行位置的记录 和 try catch 处理
//通过一个relace 的 布尔值来确定是否是replaceState

export function pushState (url?: string, replace?: boolean) {
  saveScrollPosition()
  // 通过try catch 来绕过pushState API在Safari中的调用，因为Safari中的DOM异常18 会限制pushState调用不能超过100次
  // 报错以后，使用location来进行处理
  // try...catch the pushState call to get around Safari
  // DOM Exception 18 where it limits to 100 pushState calls
  const history = window.history
  try {
    if (replace) {
      history.replaceState({ key: _key }, '', url)
    } else {
      _key = genKey()
      history.pushState({ key: _key }, '', url)
    }
  } catch (e) {
    window.location[replace ? 'replace' : 'assign'](url)
  }
}

export function replaceState (url?: string) {
  pushState(url, true)
}
