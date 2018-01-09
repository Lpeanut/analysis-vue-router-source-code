/* @flow */

/**
 * 1.首先定义了encodeReserveRE保留特殊字符[!'()*]，encodeReserveReplacer将前面的字符进行转码、commaRE保留逗号','
 * 2.转码和解码使用的是encodeURIComponent/decodeURIComponent
 * 3.转码的时候，保留上述特殊字符
 * 4.暴露的resolveQuery函数是将外界传入的query string 和 extraQuery 进行处理，返回一个参数字典对象
 *   在处理query的时候，有默认的方法，也支持传入自定义的方法
 *   value值是经过decode解码的，其中如果出现'a='这种现象，会用null来补充；如果是'a=1&a=2'，则val是一个数组
 * 5.暴露的stringifyQuery函数是将一个字典对象转换成一个query string
 *   字典对象的val会有不同的类型，如果是null，则解析成类似'a='，如果是undefined，则表示这个key是不应该解析的
 *   推测出现undefined的原因是外界选择性的传参数，一些参数没有赋值的情况下，会导致产生undefined 
 */


import { warn } from './warn'

const encodeReserveRE = /[!'()*]/g
const encodeReserveReplacer = c => '%' + c.charCodeAt(0).toString(16)
const commaRE = /%2C/g

// fixed encodeURIComponent which is more conformant to RFC3986:
// - escapes [!'()*]
// - preserve commas
const encode = str => encodeURIComponent(str)
  .replace(encodeReserveRE, encodeReserveReplacer)
  .replace(commaRE, ',')

//前面一段代码是为了将[]!'()*,这些字符保留下来

const decode = decodeURIComponent

// resolveQuery
// 参数 query是一个参数字符串 extraQuery是一个附加的参数对象，会在最后直接拼在解析query返回的对象中
// _parseQuery是传入的一个自定义解析query的函数
// 返回值：参数对象
export function resolveQuery (
  query: ?string,
  extraQuery: Dictionary<string> = {},
  _parseQuery: ?Function
): Dictionary<string> {
  const parse = _parseQuery || parseQuery
  let parsedQuery
  try {
    parsedQuery = parse(query || '')
  } catch (e) {
    process.env.NODE_ENV !== 'production' && warn(false, e.message)
    parsedQuery = {}
  }
  for (const key in extraQuery) {
    parsedQuery[key] = extraQuery[key]
  }
  return parsedQuery
}
// parseQuery 从字符串中得到一个参数对象
function parseQuery (query: string): Dictionary<string> {
  const res = {}
  //query的第一个字符如果是?#&的话，去掉一个字符
  query = query.trim().replace(/^(\?|#|&)/, '')

  if (!query) {
    return res
  }

  //分割&的时候，会出现 a=1=2&b=3的这种情况，所以需要除了第一项以外的 再拼起来
  query.split('&').forEach(param => {
    const parts = param.replace(/\+/g, ' ').split('=')  //why?
    const key = decode(parts.shift())
    //除第一项外，剩余项再用=拼接成字符串
    const val = parts.length > 0
      ? decode(parts.join('='))
      : null
    //这里是为了处理 类似a=1&a=2&a=3这样重复的参数
    if (res[key] === undefined) {
      res[key] = val
    } else if (Array.isArray(res[key])) {
      res[key].push(val)
    } else {
      res[key] = [res[key], val]
    }
  })

  return res
}

//stringifyQuery(obj)
//参数：obj 是一个字典对象，将这个对象转化成一个参数字符串
//返回值：参数字符串 ?+xxx 或 ''
//细节：map遍历的时候，val的值会有不同的类型，null或者数组中的null应该是有'a='这种字符串解析出来的，或者默认的缺省值
//undefined和数组中的undefined应该是产生于extraQuery或者外部在传某些参数的时候，这些参数不存在，导致产生了undefined，
//这也可能是解析'a='这种情况时产生一个null而不是undefined的原因，区分两者
//undefined这种情况，参数key不应该解析，所以会直接return
export function stringifyQuery (obj: Dictionary<string>): string {
  const res = obj ? Object.keys(obj).map(key => {
    const val = obj[key]
    //如果是undefined 表示这个参数key就不存在
    if (val === undefined) {
      return ''
    }
    //在解析参数的时候，如果=后面没有内容会把value设置成null  所以这里的null =后面没有内容的情况
    //a:null => 'a='
    if (val === null) {
      return encode(key)  //why?
    }
    //a=[1,'nice'] => a=1&a=nice
    //出现undefined的原因可能是extraQuery中传入的某些key 没有被赋值，所以这些key就没有必要解析出来
    if (Array.isArray(val)) {
      const result = []
      val.forEach(val2 => {
        if (val2 === undefined) {
          return
        }
        if (val2 === null) {
          result.push(encode(key))
        } else {
          result.push(encode(key) + '=' + encode(val2))
        }
      })
      return result.join('&')
    }

    return encode(key) + '=' + encode(val)
  }).filter(x => x.length > 0).join('&') : null
  return res ? `?${res}` : ''
}
