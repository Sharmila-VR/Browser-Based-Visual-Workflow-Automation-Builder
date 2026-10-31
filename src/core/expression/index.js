import { tokenize } from './tokenizer.js'
import { parse } from './parser.js'
import { evaluateAst } from './evaluator.js'

const astCache = new Map()

export function parseExpression(expressionString) {
  const trimmed = expressionString.trim()
  if (astCache.has(trimmed)) {
    return astCache.get(trimmed)
  }
  const tokens = tokenize(trimmed)
  const ast = parse(tokens)
  if (astCache.size > 1000) {
    const firstKey = astCache.keys().next().value
    astCache.delete(firstKey)
  }
  astCache.set(trimmed, ast)
  return ast
}

export function evaluateExpression(expressionString, context = {}) {
  if (!expressionString || typeof expressionString !== 'string') {
    return expressionString
  }
  try {
    const ast = parseExpression(expressionString)
    return evaluateAst(ast, context)
  } catch (error) {
    return `Error: ${error.message}`
  }
}

export function resolveTemplate(template, context = {}) {
  if (typeof template !== 'string') {
    return template
  }

  const exactMatch = template.match(/^\s*\{\{\s*([\s\S]+?)\s*\}\}\s*$/)
  if (exactMatch) {
    return evaluateExpression(exactMatch[1], context)
  }

  return template.replace(/\{\{\s*([\s\S]+?)\s*\}\}/g, (_, expr) => {
    const result = evaluateExpression(expr, context)
    if (result === undefined || result === null) return ''
    if (typeof result === 'object') return JSON.stringify(result)
    return String(result)
  })
}

export function resolveDeep(value, context = {}) {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    return resolveTemplate(value, context)
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveDeep(item, context))
  }
  if (typeof value === 'object') {
    const copy = {}
    for (const [k, v] of Object.entries(value)) {
      copy[k] = resolveDeep(v, context)
    }
    return copy
  }
  return value
}
