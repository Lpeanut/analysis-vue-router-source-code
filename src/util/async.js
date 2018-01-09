/* @flow */

//执行队列，传入一个队列，执行函数和一个回调函数
//从queue[0]开始执行，直到结束
//用一个递归函数来控制循环调用
//这里有没有涉及到尾调优化？？

export function runQueue (queue: Array<?NavigationGuard>, fn: Function, cb: Function) {
  const step = index => {
    if (index >= queue.length) {
      cb()
    } else {
      if (queue[index]) {
        fn(queue[index], () => {
          step(index + 1)
        })
      } else {
        step(index + 1)
      }
    }
  }
  step(0)
}
