export const standardFunctions = {
  upper: (str) => String(str ?? '').toUpperCase(),
  lower: (str) => String(str ?? '').toLowerCase(),
  trim: (str) => String(str ?? '').trim(),
  length: (val) => {
    if (val == null) return 0
    if (Array.isArray(val) || typeof val === 'string') return val.length
    if (typeof val === 'object') return Object.keys(val).length
    return 0
  },
  json: (val) => {
    try {
      return JSON.stringify(val, null, 2)
    } catch {
      return String(val)
    }
  },
  parseJson: (val) => {
    try {
      return JSON.parse(val)
    } catch {
      return null
    }
  },
  date: (val) => {
    const d = val ? new Date(val) : new Date()
    return isNaN(d.getTime()) ? '' : d.toISOString()
  },
  default: (val, fallback) => {
    return val !== undefined && val !== null && val !== '' ? val : fallback
  },
  concat: (...args) => args.map((a) => (a == null ? '' : String(a))).join(''),
  round: (num, decimals = 0) => {
    const n = Number(num)
    if (isNaN(n)) return 0
    const factor = Math.pow(10, decimals)
    return Math.round(n * factor) / factor
  },
  keys: (obj) => (obj && typeof obj === 'object' ? Object.keys(obj) : []),
  values: (obj) => (obj && typeof obj === 'object' ? Object.values(obj) : []),
  contains: (target, search) => {
    if (Array.isArray(target)) return target.includes(search)
    if (typeof target === 'string') return target.includes(String(search))
    return false
  }
}

export function evaluateAst(node, context = {}) {
  if (!node) return undefined

  switch (node.type) {
    case 'Literal':
      return node.value

    case 'Identifier': {
      const name = node.name
      if (name in context) {
        return context[name]
      }
      if (name in standardFunctions) {
        return standardFunctions[name]
      }
      return undefined
    }

    case 'MemberExpression': {
      const obj = evaluateAst(node.object, context)
      if (obj === null || obj === undefined) {
        return undefined
      }
      let prop
      if (node.computed) {
        prop = evaluateAst(node.property, context)
      } else {
        prop = node.property.name
      }
      return obj[prop]
    }

    case 'CallExpression': {
      const callee = evaluateAst(node.callee, context)
      if (typeof callee !== 'function') {
        throw new Error(`Expression is not callable: ${JSON.stringify(node.callee)}`)
      }
      const args = node.arguments.map((arg) => evaluateAst(arg, context))
      return callee(...args)
    }

    case 'UnaryExpression': {
      const arg = evaluateAst(node.argument, context)
      switch (node.operator) {
        case '!':
          return !arg
        case '-':
          return -Number(arg)
        case '+':
          return +Number(arg)
        default:
          throw new Error(`Unsupported unary operator: ${node.operator}`)
      }
    }

    case 'BinaryExpression': {
      const left = evaluateAst(node.left, context)
      const right = evaluateAst(node.right, context)
      switch (node.operator) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '/':
          return right !== 0 ? left / right : 0
        case '%':
          return left % right
        case '==':
          return left == right
        case '!=':
          return left != right
        case '<':
          return left < right
        case '>':
          return left > right
        case '<=':
          return left <= right
        case '>=':
          return left >= right
        default:
          throw new Error(`Unsupported binary operator: ${node.operator}`)
      }
    }

    case 'LogicalExpression': {
      const left = evaluateAst(node.left, context)
      switch (node.operator) {
        case '&&':
          return left ? evaluateAst(node.right, context) : left
        case '||':
          return left ? left : evaluateAst(node.right, context)
        case '??':
          return left !== null && left !== undefined ? left : evaluateAst(node.right, context)
        default:
          throw new Error(`Unsupported logical operator: ${node.operator}`)
      }
    }

    case 'ConditionalExpression': {
      const test = evaluateAst(node.test, context)
      return test ? evaluateAst(node.consequent, context) : evaluateAst(node.alternate, context)
    }

    case 'ArrayLiteral': {
      return node.elements.map((el) => evaluateAst(el, context))
    }

    case 'ObjectLiteral': {
      const result = {}
      for (const item of node.properties) {
        result[item.key] = evaluateAst(item.value, context)
      }
      return result
    }

    default:
      throw new Error(`Unknown AST node type: ${node.type}`)
  }
}
