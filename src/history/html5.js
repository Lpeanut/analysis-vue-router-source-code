/* @flow */

/**
 * 1.HTML5Histroy集成Histroy类
 * 2.在进行HTML5History实例化的时候，
 *    1.给当前页面的state加入一个key，用来标记当前的历史
 *    2.添加浏览器popstate事件的监听，控制位置滚动
 * 3.go方法
 * 4.push/replace方法，调用histroy 的pushState replaceState方法， 同时判断滚动行为是否应该执行
 * 5.getLocation 见最下方
 */



import type Router from '../index'   //先理解为index页面到处的default值
import { History } from './base'
import { cleanPath } from '../util/path'
import { START } from '../util/route'
import { setupScroll, handleScroll } from '../util/scroll'
import { pushState, replaceState, supportsPushState } from '../util/push-state'

//定义HTML5Histroy类  继承自Histroy
export class HTML5History extends History {
  constructor (router: Router, base: ?string) {
    super(router, base)  //super  子类必须调用一次  super指向父类
    //expectScroll  预计滚动
    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      setupScroll()   //给当前页面的state中加入一个key
    }

    const initLocation = getLocation(this.base)
    window.addEventListener('popstate', e => {
      const current = this.current

      // Avoiding first `popstate` event dispatched in some browsers but first
      // history route not updated since async guard at the same time.

      //避免在某些浏览器中，第一次派发的popstate事件的时候，异步路由守卫并没有随着第一个history route更新而更新
      const location = getLocation(this.base)
      //如果current ===START 或者 ===初始的location  return
      if (this.current === START && location === initLocation) {
        return
      }

      this.transitionTo(location, route => {
        if (supportsScroll) {
          handleScroll(router, route, current, true)
        }
      })
    })
  }
  //histroy.go()  跳转历史
  go (n: number) {
    window.history.go(n)
  }
  //push  push的时候 是不会触发popstate的
  //调用histroy.push API 
  // 1.跳转url  2.记录scroll信息
  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      pushState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }
  //同push
  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      replaceState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  ensureURL (push?: boolean) {
    //如果获取path 跟 当前路由的中的fullPath不一致，进行cleanPath处理，然后进行路由跳转
    if (getLocation(this.base) !== this.current.fullPath) {
      const current = cleanPath(this.base + this.current.fullPath)
      push ? pushState(current) : replaceState(current)
    }
  }

  getCurrentLocation (): string {
    return getLocation(this.base)
  }
}

//返回字符串
//1.获取path = window.location.pathname
//2.如果base包含在path中，并且在开头位置，将path中的base除去
//3.返回path || '/' + seatch + hash
export function getLocation (base: string): string {
  let path = window.location.pathname  //获取根域名后的path路径（不带搜索条件和hash值）
  if (base && path.indexOf(base) === 0) {  //除去base
    path = path.slice(base.length)
  }
  //返回去除base的path + search字符串 + hash字符串
  return (path || '/') + window.location.search + window.location.hash
}
