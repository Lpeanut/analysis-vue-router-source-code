/* @flow */

/**
 * 1.HashHistory继承自Histroy
 * 2.检查base值如果this.base没有#  添加#并repace一下
 * 3.启动Listeners，如果支持Scroll，启动scroll。 添加popstate或者hashchange的监听，取决于是否支持pushState 
 * 4.go push  replace方法类似于html5 后两个在不支持pushState的时候略微有些改动：push方法 直接调用location.hash 来改变url
 *   replace方法直接调用location.replace来调用
 * 5.getHash方法 获取#后面的hash字符串
 */

import type Router from '../index'
import { History } from './base'
import { cleanPath } from '../util/path'
import { getLocation } from './html5'
import { setupScroll, handleScroll } from '../util/scroll'
import { pushState, replaceState, supportsPushState } from '../util/push-state'

export class HashHistory extends History {
  constructor (router: Router, base: ?string, fallback: boolean) {
    super(router, base)
    // 检查历史回退深度链接
    // check history fallback deeplinking
    // 如果this.base没有#  添加#并repace一下
    if (fallback && checkFallback(this.base)) {
      return
    }
    ensureSlash()
  }

  // this is delayed until the app mounts
  // to avoid the hashchange listener being fired too early
  //延迟到app mounted 以后再启动监听，以防hashchage事件监听启动的太早
  setupListeners () {
    const router = this.router
    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      setupScroll()
    }
    //如果支持pushState 就监听popstate  如果不支持 就监听hashchange
    window.addEventListener(supportsPushState ? 'popstate' : 'hashchange', () => {
      const current = this.current
      if (!ensureSlash()) {
        return
      }
      this.transitionTo(getHash(), route => {
        if (supportsScroll) {
          handleScroll(this.router, route, current, true)
        }
        if (!supportsPushState) {
          replaceHash(route.fullPath)
        }
      })
    })
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      pushHash(route.fullPath)
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      replaceHash(route.fullPath)
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  go (n: number) {
    window.history.go(n)
  }

  ensureURL (push?: boolean) {
    const current = this.current.fullPath
    if (getHash() !== current) {
      push ? pushHash(current) : replaceHash(current)
    }
  }

  getCurrentLocation () {
    return getHash()
  }
}

//如果base没有/#  给base 加上/#
function checkFallback (base) {
  const location = getLocation(base)
  if (!/^\/#/.test(location)) {
    window.location.replace(
      cleanPath(base + '/#' + location)
    )
    return true
  }
}

//判断获取的hash值不是以/开头的  返回布尔值  
//如果不是，在hash前面补上/ 并调用replaceHash
function ensureSlash (): boolean {
  const path = getHash()
  if (path.charAt(0) === '/') {
    return true
  }
  replaceHash('/' + path)
  return false
}

//获取#后面的内容 缺省值为''
export function getHash (): string {
  //不能使用window.localtion.hash,因为在浏览器中这个方法不具有一致性，firefox会预先对它进行解码
  // We can't use window.location.hash here because it's not
  // consistent across browsers - Firefox will pre-decode it!
  const href = window.location.href
  const index = href.indexOf('#')
  return index === -1 ? '' : href.slice(index + 1)
}

//1.base=获取地址栏中#以前的部分
//2.返回 base + # + path
function getUrl (path) {
  const href = window.location.href
  const i = href.indexOf('#')
  const base = i >= 0 ? href.slice(0, i) : href
  return `${base}#${path}`
}

//支持pushState 调用pushState方法 否则使用location.hash方法  repalceHash同理
function pushHash (path) {
  if (supportsPushState) {
    pushState(getUrl(path))
  } else {
    window.location.hash = path
  }
}

function replaceHash (path) {
  if (supportsPushState) {
    replaceState(getUrl(path))
  } else {
    //不会刷新页面，并且历史记录是replace的 与histroy 的 replaceState 表现一致
    window.location.replace(getUrl(path))
  }
}
