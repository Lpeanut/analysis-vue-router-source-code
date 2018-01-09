/* @flow */

/**
 * 1.resolvePath  解析的是文件路径 先判断是否是相对路径，如果是'?'或'#'开头，直接返回base + relative路径
 * 如果不是前两种情况，就需要处理'../' 和 './' 最后返回完整的文件路径
 * 问题，append = false 的情况，会不会出现/aa/bb 最后return /aa的情况（也就是base的末尾是不是总是带着'/'）
 * 
 * 2.parsePath 解析的是url路径,先解析hash路径，然后解析参数路径，剩下的就是出去hash和参数的地址路径
 * 返回hash query path 组成的对象
 * 
 * 3.cleanPath 将双斜杠转换成单斜杠
 */


export function resolvePath (
  relative: string,
  base: string,
  append?: boolean
): string {
  const firstChar = relative.charAt(0)
  if (firstChar === '/') {
    return relative
  }

  if (firstChar === '?' || firstChar === '#') {
    return base + relative
  }

  const stack = base.split('/')

  //到这里就排除了前两种情况，base可能会在尾部有一个'/',去掉这个'/'
  // '/aa/bb/cc/dd/' => '/aa/bb/cc/dd'
  // remove trailing segment if:
  // - not appending
  // - appending to trailing slash (last segment is empty)
  if (!append || !stack[stack.length - 1]) {
    stack.pop()
  }

  //解析相对路径
  //处理'../' 和 './' 这两种情况
  //前者将base分割的数组pop出去最后一项（相当于../以后的路径），后者则不做操作，其他就是往base数组里面加路径
  // resolve relative path
  const segments = relative.replace(/^\//, '').split('/')
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (segment === '..') {
      stack.pop()
    } else if (segment !== '.') {
      stack.push(segment)
    }
  }

  //确保最前面的'/'是存在的
  // ensure leading slash
  if (stack[0] !== '') {
    stack.unshift('')
  }

  return stack.join('/')
}

export function parsePath (path: string): {
  path: string;
  query: string;
  hash: string;
} {
  let hash = ''
  let query = ''
  //先解析'#'，井号以后的都是hash路径
  //新path将变成原path中#号以前的部分
  const hashIndex = path.indexOf('#')
  if (hashIndex >= 0) {
    hash = path.slice(hashIndex)
    path = path.slice(0, hashIndex)
  }
  //对新path进行解析，解析出来?后面的参数部分
  //剩下的path就是真正的地址路径
  const queryIndex = path.indexOf('?')
  if (queryIndex >= 0) {
    query = path.slice(queryIndex + 1)
    path = path.slice(0, queryIndex)
  }

  return {
    path,
    query,
    hash
  }
}

//处理双斜杠，将其转换成单斜杠
export function cleanPath (path: string): string {
  return path.replace(/\/\//g, '/')
}
