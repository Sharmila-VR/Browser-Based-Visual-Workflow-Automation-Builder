import { TokenType } from './tokenizer.js'

export class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.current = 0
  }

  peek() {
    return this.tokens[this.current] || { type: TokenType.EOF, value: null }
  }

  previous() {
    return this.tokens[this.current - 1]
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF
  }

  advance() {
    if (!this.isAtEnd()) this.current++
    return this.previous()
  }

  match(types, values = null) {
    const token = this.peek()
    const typeMatch = Array.isArray(types) ? types.includes(token.type) : token.type === types
    if (!typeMatch) return false
    if (values !== null) {
      const valMatch = Array.isArray(values) ? values.includes(token.value) : token.value === values
      if (!valMatch) return false
    }
    this.advance()
    return true
  }

  consume(type, expectedValue = null, errorMessage = 'Unexpected token') {
    const token = this.peek()
    if (token.type !== type || (expectedValue !== null && token.value !== expectedValue)) {
      throw new Error(`${errorMessage}. Got: ${token.value ?? token.type}`)
    }
    return this.advance()
  }

  parse() {
    if (this.isAtEnd()) {
      return { type: 'Literal', value: '' }
    }
    return this.expression()
  }

  expression() {
    return this.ternary()
  }

  ternary() {
    let expr = this.logicalOr()

    if (this.match(TokenType.OPERATOR, '?')) {
      const consequent = this.expression()
      this.consume(TokenType.OPERATOR, ':', 'Expected colon in ternary expression')
      const alternate = this.expression()
      expr = {
        type: 'ConditionalExpression',
        test: expr,
        consequent,
        alternate
      }
    }

    return expr
  }

  logicalOr() {
    let expr = this.logicalAnd()

    while (this.match(TokenType.OPERATOR, ['||', '??'])) {
      const operator = this.previous().value
      const right = this.logicalAnd()
      expr = {
        type: 'LogicalExpression',
        operator,
        left: expr,
        right
      }
    }

    return expr
  }

  logicalAnd() {
    let expr = this.equality()

    while (this.match(TokenType.OPERATOR, '&&')) {
      const operator = this.previous().value
      const right = this.equality()
      expr = {
        type: 'LogicalExpression',
        operator,
        left: expr,
        right
      }
    }

    return expr
  }

  equality() {
    let expr = this.relational()

    while (this.match(TokenType.OPERATOR, ['==', '!='])) {
      const operator = this.previous().value
      const right = this.relational()
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      }
    }

    return expr
  }

  relational() {
    let expr = this.additive()

    while (this.match(TokenType.OPERATOR, ['<', '>', '<=', '>='])) {
      const operator = this.previous().value
      const right = this.additive()
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      }
    }

    return expr
  }

  additive() {
    let expr = this.multiplicative()

    while (this.match(TokenType.OPERATOR, ['+', '-'])) {
      const operator = this.previous().value
      const right = this.multiplicative()
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      }
    }

    return expr
  }

  multiplicative() {
    let expr = this.unary()

    while (this.match(TokenType.OPERATOR, ['*', '/', '%'])) {
      const operator = this.previous().value
      const right = this.unary()
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      }
    }

    return expr
  }

  unary() {
    if (this.match(TokenType.OPERATOR, ['!', '-', '+'])) {
      const operator = this.previous().value
      const argument = this.unary()
      return {
        type: 'UnaryExpression',
        operator,
        argument
      }
    }

    return this.postfix()
  }

  postfix() {
    let expr = this.primary()

    while (true) {
      if (this.match(TokenType.PUNCTUATION, '.')) {
        const propToken = this.consume(TokenType.IDENTIFIER, null, 'Expected identifier after dot')
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: { type: 'Identifier', name: propToken.value },
          computed: false
        }
      } else if (this.match(TokenType.PUNCTUATION, '[')) {
        const indexExpr = this.expression()
        this.consume(TokenType.PUNCTUATION, ']', 'Expected closing bracket ]')
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: indexExpr,
          computed: true
        }
      } else if (this.match(TokenType.PUNCTUATION, '(')) {
        const args = []
        if (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== ')') {
          do {
            args.push(this.expression())
          } while (this.match(TokenType.PUNCTUATION, ','))
        }
        this.consume(TokenType.PUNCTUATION, ')', 'Expected closing parenthesis )')
        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: args
        }
      } else {
        break
      }
    }

    return expr
  }

  primary() {
    if (this.match(TokenType.NUMBER)) {
      return { type: 'Literal', value: this.previous().value }
    }

    if (this.match(TokenType.STRING)) {
      return { type: 'Literal', value: this.previous().value }
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const val = this.previous().value
      if (val === 'true') return { type: 'Literal', value: true }
      if (val === 'false') return { type: 'Literal', value: false }
      if (val === 'null') return { type: 'Literal', value: null }
      if (val === 'undefined') return { type: 'Literal', value: undefined }
      return { type: 'Identifier', name: val }
    }

    if (this.match(TokenType.PUNCTUATION, '(')) {
      const expr = this.expression()
      this.consume(TokenType.PUNCTUATION, ')', 'Expected closing parenthesis )')
      return expr
    }

    if (this.match(TokenType.PUNCTUATION, '[')) {
      const elements = []
      if (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== ']') {
        do {
          elements.push(this.expression())
        } while (this.match(TokenType.PUNCTUATION, ','))
      }
      this.consume(TokenType.PUNCTUATION, ']', 'Expected closing bracket ]')
      return { type: 'ArrayLiteral', elements }
    }

    if (this.match(TokenType.PUNCTUATION, '{')) {
      const properties = []
      if (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== '}') {
        do {
          let key
          if (this.match(TokenType.IDENTIFIER) || this.match(TokenType.STRING)) {
            key = this.previous().value
          } else {
            throw new Error('Expected property name in object literal')
          }
          this.consume(TokenType.OPERATOR, ':', 'Expected colon after key')
          const value = this.expression()
          properties.push({ key, value })
        } while (this.match(TokenType.PUNCTUATION, ','))
      }
      this.consume(TokenType.PUNCTUATION, '}', 'Expected closing brace }')
      return { type: 'ObjectLiteral', properties }
    }

    throw new Error(`Unexpected token: ${this.peek().value}`)
  }
}

export function parse(tokens) {
  const parser = new Parser(tokens)
  return parser.parse()
}
