import { describe, it, expect } from 'vitest'
import { tokenize } from '../src/core/expression/tokenizer.js'
import { parse } from '../src/core/expression/parser.js'
import { evaluateAst, standardFunctions } from '../src/core/expression/evaluator.js'
import { evaluateExpression, resolveTemplate, resolveDeep, parseExpression } from '../src/core/expression/index.js'

describe('Custom Expression Engine', () => {
  it('tokenizes numbers, strings, identifiers, and operators', () => {
    const tokens = tokenize('price * 1.15 + " tax\\n" == null && true || !false')
    expect(tokens.length).toBeGreaterThan(5)
    expect(tokens[0].value).toBe('price')
    expect(tokens[1].value).toBe('*')
    expect(tokens[2].value).toBe(1.15)
  })

  it('evaluates basic arithmetic, unaries, and comparisons', () => {
    expect(evaluateExpression('10 + 20 * 2')).toBe(50)
    expect(evaluateExpression('(10 + 20) * 2')).toBe(60)
    expect(evaluateExpression('15 > 10')).toBe(true)
    expect(evaluateExpression('5 <= 3')).toBe(false)
    expect(evaluateExpression('5 >= 5')).toBe(true)
    expect(evaluateExpression('5 < 10')).toBe(true)
    expect(evaluateExpression('100 / 4')).toBe(25)
    expect(evaluateExpression('10 % 3')).toBe(1)
    expect(evaluateExpression('10 - 4')).toBe(6)
    expect(evaluateExpression('-5 + +10')).toBe(5)
    expect(evaluateExpression('10 != 20')).toBe(true)
    expect(evaluateExpression('10 == 10')).toBe(true)
    expect(evaluateExpression('10 / 0')).toBe(0)
  })

  it('evaluates ternary operators, nullish, and logical expressions', () => {
    expect(evaluateExpression('true ? "yes" : "no"')).toBe('yes')
    expect(evaluateExpression('false ? 1 : 2')).toBe(2)
    expect(evaluateExpression('true && false')).toBe(false)
    expect(evaluateExpression('true && "valid"')).toBe('valid')
    expect(evaluateExpression('false || true')).toBe(true)
    expect(evaluateExpression('null ?? "fallback"')).toBe('fallback')
    expect(evaluateExpression('"orig" ?? "fallback"')).toBe('orig')
    expect(evaluateExpression('!false')).toBe(true)
    expect(evaluateExpression('!true')).toBe(false)
  })

  it('parses and evaluates object and array literals', () => {
    expect(evaluateExpression('[1, 2, 3]')).toEqual([1, 2, 3])
    expect(evaluateExpression('{ a: 10, b: "hello" }')).toEqual({ a: 10, b: 'hello' })
    expect(evaluateExpression('{ "spaced key": 42 }')).toEqual({ 'spaced key': 42 })
  })

  it('resolves nested property and array index access', () => {
    const context = {
      $node: {
        fetch: {
          data: {
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' }
            ]
          }
        }
      }
    }

    expect(evaluateExpression('$node.fetch.data.users[0].name', context)).toBe('Alice')
    expect(evaluateExpression('$node.fetch.data.users[1].id + 10', context)).toBe(12)
    expect(evaluateExpression('$node.nonexistent.data', context)).toBeUndefined()
  })

  it('executes built-in standard functions safely', () => {
    const context = {
      name: '  workflow  ',
      items: [10, 20, 30],
      obj: { a: 1, b: 2 }
    }

    expect(evaluateExpression('upper(trim(name))', context)).toBe('WORKFLOW')
    expect(evaluateExpression('lower("HELLO")', context)).toBe('hello')
    expect(evaluateExpression('length(items)', context)).toBe(3)
    expect(evaluateExpression('length(obj)', context)).toBe(2)
    expect(evaluateExpression('length("test")', context)).toBe(4)
    expect(evaluateExpression('length(null)', context)).toBe(0)
    expect(evaluateExpression('default(null, "active")', context)).toBe('active')
    expect(evaluateExpression('concat("Node: ", trim(name))', context)).toBe('Node: workflow')
    expect(evaluateExpression('round(3.14159, 2)', context)).toBe(3.14)
    expect(evaluateExpression('round("invalid", 2)', context)).toBe(0)
    expect(evaluateExpression('contains(items, 20)', context)).toBe(true)
    expect(evaluateExpression('contains("antigravity", "grav")', context)).toBe(true)
    expect(evaluateExpression('keys(obj)', context)).toEqual(['a', 'b'])
    expect(evaluateExpression('values(obj)', context)).toEqual([1, 2])
    expect(evaluateExpression('keys(null)', context)).toEqual([])
    expect(evaluateExpression('values(null)', context)).toEqual([])

    expect(standardFunctions.json({ x: 1 })).toContain('"x": 1')
    expect(standardFunctions.parseJson('{"y": 2}')).toEqual({ y: 2 })
    expect(standardFunctions.parseJson('invalid')).toBeNull()
    expect(standardFunctions.date(new Date(1700000000000))).toBe(new Date(1700000000000).toISOString())
    expect(standardFunctions.date('invalid-date')).toBe('')
  })

  it('resolves templates containing double curly expressions and deep objects', () => {
    const context = {
      user: 'Sarah',
      count: 42
    }
    const template = 'Hello {{ user }}, you have {{ count * 2 }} notifications.'
    expect(resolveTemplate(template, context)).toBe('Hello Sarah, you have 84 notifications.')
    expect(resolveTemplate('{{ user }}', context)).toBe('Sarah')
    expect(resolveTemplate(123, context)).toBe(123)

    const deepObj = {
      greeting: 'Hi {{ user }}',
      tags: ['{{ user }}', 'static'],
      nested: {
        score: '{{ count + 1 }}'
      }
    }
    const resolved = resolveDeep(deepObj, context)
    expect(resolved.greeting).toBe('Hi Sarah')
    expect(resolved.tags[0]).toBe('Sarah')
    expect(resolved.nested.score).toBe(43)
    expect(resolveDeep(null)).toBeNull()
  })

  it('handles errors gracefully in expressions', () => {
    expect(evaluateExpression('10 +')).toContain('Error:')
    expect(evaluateExpression('')).toBe('')
    expect(evaluateExpression(null)).toBeNull()
    expect(() => evaluateAst({ type: 'UnknownType' })).toThrow()
  })
})
