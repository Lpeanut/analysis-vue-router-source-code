/* @flow */


/** 
 * state histroy变化不会触发 scrollRestoration 所以需要进行位置滚动处理 或者 是为了达到浏览器兼容
 * 1. 首先创建一个positionStore对象，通过暴露出去的saveScrollPosition方法（这里设置了全局的popstate方法，在pushState的时候也在调用这个方法）来存储各个state history 的位置，
 *    存储方法就是用pushState/replaceState的时间来记录位置
 * 2. 在handleScroll中首先检查router.options.scrollBehavior方法是否存在，判断是否支持滚动
 *    若存在，则调用getScrollPosition来拿到当前state的位置，调用router.options.scrollBehavior方法，来检查是不是需不需要进行滚动
 * 3. (router.options.scrollBehavior返回值是什么?)根据返回值，在决定如何调用scrollToPosition
 * 4. scrollToPosition函数里首先确定了需要滚动的位置(为什么需要传一个DOM元素？)，然后调用window.scrollTo来进行滚动
 */


import type Router from '../index'
import { assert } from './warn'
import { getStateKey, setStateKey } from './push-state'

const positionStore = Object.create(null)

// 设置scroll
export function setupScroll () {
  // Fix for #1585 for Firefox
  // 修复#1585 issue 在firefox上的问题
  // 先调用一次replaceState 给自己加上时间标记 方便记录当前页面的滚动位置
  window.history.replaceState({ key: getStateKey() }, '')
  //histroy切换的时候，将_key切换成下一个state的key，以便于查询该state变动时的位置信息
  window.addEventListener('popstate', e => {
    // e表示的目标历史
    saveScrollPosition()
    if (e.state && e.state.key) {
      //设置时间
      setStateKey(e.state.key)
    }
  })
}

export function handleScroll (
  router: Router,
  to: Route,
  from: Route,
  isPop: boolean
) {
  if (!router.app) {
    return
  }
  //判断是否支持滚动
  const behavior = router.options.scrollBehavior
  if (!behavior) {
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    //如果router.options.scrollBehavior不是一个函数  进行报错
    assert(typeof behavior === 'function', `scrollBehavior must be a function`)
  }
  
  // 在scroll之前 等待重新渲染完成
  // wait until re-render finishes before scrolling
  router.app.$nextTick(() => {
    const position = getScrollPosition()  //获取state中的位置信息
    const shouldScroll = behavior.call(router, to, from, isPop ? position : null)

    if (!shouldScroll) {
      return
    }
    //如果shouldScroll.then是函数，执行滚动 why?
    //否则，执行滚动
    if (typeof shouldScroll.then === 'function') {
      shouldScroll.then(shouldScroll => {
        scrollToPosition((shouldScroll: any), position)
      }).catch(err => {
        if (process.env.NODE_ENV !== 'production') {
          assert(false, err.toString())
        }
      })
    } else {
      scrollToPosition(shouldScroll, position)
    }
  })
}

//positionStore用来存储浏览器历史的位置，key是每次pushState的时间 value是一个对象{x:xx,y:xx}分别储存x\y坐标
//所以 That is why to save the time when pushState or ReplaceState
//存位置
export function saveScrollPosition () {
  const key = getStateKey()
  if (key) {
    positionStore[key] = {
      x: window.pageXOffset,
      y: window.pageYOffset
    }
  }
}
//读位置  不暴露方法 直接在其他暴露的接口中调用
function getScrollPosition (): ?Object {
  const key = getStateKey()
  if (key) {
    return positionStore[key]
  }
}

function getElementPosition (el: Element, offset: Object): Object {
  const docEl: any = document.documentElement  // html
  const docRect = docEl.getBoundingClientRect() // html元素相对浏览器视口的位置
  const elRect = el.getBoundingClientRect() // 某个dom元素相对于视口的位置
  //返回需要滚动的距离
  return {
    x: elRect.left - docRect.left - offset.x,
    y: elRect.top - docRect.top - offset.y
  }
}

function isValidPosition (obj: Object): boolean {
  return isNumber(obj.x) || isNumber(obj.y)
}

function normalizePosition (obj: Object): Object {
  return {
    x: isNumber(obj.x) ? obj.x : window.pageXOffset,
    y: isNumber(obj.y) ? obj.y : window.pageYOffset
  }
}

function normalizeOffset (obj: Object): Object {
  return {
    x: isNumber(obj.x) ? obj.x : 0,
    y: isNumber(obj.y) ? obj.y : 0
  }
}

function isNumber (v: any): boolean {
  return typeof v === 'number'
}

//如果sholdScroll存在的话，是一个对象，selector属性是一个表示元素的string

function scrollToPosition (shouldScroll, position) {
  const isObject = typeof shouldScroll === 'object'
  if (isObject && typeof shouldScroll.selector === 'string') {
    const el = document.querySelector(shouldScroll.selector)
    if (el) {
      let offset = shouldScroll.offset && typeof shouldScroll.offset === 'object' ? shouldScroll.offset : {}
      offset = normalizeOffset(offset)   // 如果x/y不存在，默认补0
      position = getElementPosition(el, offset)  //获取元素的位置  why t get this?
    } else if (isValidPosition(shouldScroll)) {
      position = normalizePosition(shouldScroll)
    }
  } else if (isObject && isValidPosition(shouldScroll)) {  //如果x或y有数值 就给position赋个值
    position = normalizePosition(shouldScroll)
  }

  if (position) {  //滚动到目标位置
    window.scrollTo(position.x, position.y)
  }
}
