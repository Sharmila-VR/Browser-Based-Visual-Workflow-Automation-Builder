export const TokenType = {
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  IDENTIFIER: 'IDENTIFIER',
  OPERATOR: 'OPERATOR',
  PUNCTUATION: 'PUNCTUATION',
  EOF: 'EOF'
}

export function tokenize(input) {
  const tokens = []
  let cursor = 0
  const length = input.length

  while (cursor < length) {
    const char = input[cursor]

    if (/\s/.test(char)) {
      cursor++
      continue
    }

    if (char === '"' || char === "'") {
      const quote = char
      let value = ''
      cursor++
      while (cursor < length && input[cursor] !== quote) {
        if (input[cursor] === '\\' && cursor + 1 < length) {
          cursor++
          const escaped = input[cursor]
          if (escaped === 'n') value += '\n'
          else if (escaped === 't') value += '\t'
          else if (escaped === 'r') value += '\r'
          else value += escaped
        } else {
          value += input[cursor]
        }
        cursor++
      }
      if (cursor < length) {
        cursor++
      }
      tokens.push({ type: TokenType.STRING, value })
      continue
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(input[cursor + 1]))) {
      let value = ''
      while (cursor < length && /[0-9.]/.test(input[cursor])) {
        value += input[cursor]
        cursor++
      }
      tokens.push({ type: TokenType.NUMBER, value: Number(value) })
      continue
    }

    if (/[a-zA-Z_$]/.test(char)) {
      let value = ''
      while (cursor < length && /[a-zA-Z0-9_$]/.test(input[cursor])) {
        value += input[cursor]
        cursor++
      }
      tokens.push({ type: TokenType.IDENTIFIER, value })
      continue
    }

    const twoChar = input.slice(cursor, cursor + 2)
    if (['==', '!=', '<=', '>=', '&&', '||', '??'].includes(twoChar)) {
      tokens.push({ type: TokenType.OPERATOR, value: twoChar })
      cursor += 2
      continue
    }

    if (['+', '-', '*', '/', '%', '<', '>', '!', '?', ':'].includes(char)) {
      tokens.push({ type: TokenType.OPERATOR, value: char })
      cursor++
      continue
    }

    if (['(', ')', '[', ']', '{', '}', '.', ',', ';'].includes(char)) {
      tokens.push({ type: TokenType.PUNCTUATION, value: char })
      cursor++
      continue
    }

    cursor++
  }

  tokens.push({ type: TokenType.EOF, value: null })
  return tokens
}
