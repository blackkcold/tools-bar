(function (global) {
  const OPERATORS = {
    '+': { precedence: 1, fn: (a, b) => a + b },
    '-': { precedence: 1, fn: (a, b) => a - b },
    '*': { precedence: 2, fn: (a, b) => a * b },
    '/': { precedence: 2, fn: (a, b) => a / b },
    '%': { precedence: 2, fn: (a, b) => a % b }
  };

  function isUnaryPosition(tokens) {
    if (tokens.length === 0) return true;
    const prev = tokens[tokens.length - 1];
    return prev.type === 'operator' || prev.type === 'lparen';
  }

  function tokenize(expression) {
    const input = String(expression || '').replace(/\s+/g, '');
    if (!input) {
      throw new Error('Empty expression');
    }

    const tokens = [];
    let i = 0;

    while (i < input.length) {
      const ch = input[i];

      if (ch === '(') {
        tokens.push({ type: 'lparen', value: ch });
        i += 1;
        continue;
      }

      if (ch === ')') {
        tokens.push({ type: 'rparen', value: ch });
        i += 1;
        continue;
      }

      if (OPERATORS[ch]) {
        if (isUnaryPosition(tokens)) {
          const nextChar = input[i + 1];
          if (nextChar === '(') {
            if (ch === '-') {
              tokens.push({ type: 'number', value: 0 });
              tokens.push({ type: 'operator', value: '-' });
            }
            i += 1;
            continue;
          }

          let j = i + 1;
          while (j < input.length && /[0-9.]/.test(input[j])) {
            j += 1;
          }

          const signedNumber = input.slice(i, j);
          const parsed = Number(signedNumber);
          if (!Number.isFinite(parsed)) {
            throw new Error('Invalid number');
          }
          tokens.push({ type: 'number', value: parsed });
          i = j;
          continue;
        }

        tokens.push({ type: 'operator', value: ch });
        i += 1;
        continue;
      }

      if (/[0-9.]/.test(ch)) {
        let j = i + 1;
        while (j < input.length && /[0-9.]/.test(input[j])) {
          j += 1;
        }

        const raw = input.slice(i, j);
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          throw new Error('Invalid number');
        }
        tokens.push({ type: 'number', value: parsed });
        i = j;
        continue;
      }

      throw new Error(`Unsupported character: ${ch}`);
    }

    return tokens;
  }

  function toRpn(tokens) {
    const output = [];
    const stack = [];

    for (const token of tokens) {
      if (token.type === 'number') {
        output.push(token);
        continue;
      }

      if (token.type === 'operator') {
        const current = OPERATORS[token.value];
        if (!current) {
          throw new Error(`Unsupported operator: ${token.value}`);
        }

        while (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top.type !== 'operator') break;
          const topOp = OPERATORS[top.value];
          if (!topOp || topOp.precedence < current.precedence) break;
          output.push(stack.pop());
        }

        stack.push(token);
        continue;
      }

      if (token.type === 'lparen') {
        stack.push(token);
        continue;
      }

      if (token.type === 'rparen') {
        let matched = false;
        while (stack.length > 0) {
          const top = stack.pop();
          if (top.type === 'lparen') {
            matched = true;
            break;
          }
          output.push(top);
        }
        if (!matched) {
          throw new Error('Mismatched parentheses');
        }
      }
    }

    while (stack.length > 0) {
      const top = stack.pop();
      if (top.type === 'lparen' || top.type === 'rparen') {
        throw new Error('Mismatched parentheses');
      }
      output.push(top);
    }

    return output;
  }

  function evaluateRpn(tokens) {
    const stack = [];

    for (const token of tokens) {
      if (token.type === 'number') {
        stack.push(token.value);
        continue;
      }

      const b = stack.pop();
      const a = stack.pop();
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error('Invalid expression');
      }

      const result = OPERATORS[token.value].fn(a, b);
      if (!Number.isFinite(result)) {
        throw new Error('Math error');
      }
      stack.push(result);
    }

    if (stack.length !== 1) {
      throw new Error('Invalid expression');
    }

    return stack[0];
  }

  function formatResult(value) {
    const rounded = Number(value.toFixed(12));
    return String(rounded);
  }

  function evaluateExpression(expression) {
    const tokens = tokenize(expression);
    const rpn = toRpn(tokens);
    return formatResult(evaluateRpn(rpn));
  }

  function bindCalculator(displayId) {
    const getDisplay = () => document.getElementById(displayId);

    const requireDisplay = () => {
      const display = getDisplay();
      if (!display) {
        throw new Error(`Missing display element: ${displayId}`);
      }
      return display;
    };

    return {
      appendToDisplay(value) {
        requireDisplay().value += String(value);
      },
      clearDisplay() {
        requireDisplay().value = '';
      },
      deleteChar() {
        const display = requireDisplay();
        display.value = display.value.slice(0, -1);
      },
      calculate() {
        const display = requireDisplay();
        try {
          display.value = evaluateExpression(display.value);
        } catch (error) {
          display.value = 'Error';
        }
      }
    };
  }

  global.CalculatorCore = {
    evaluateExpression,
    bindCalculator
  };
})(window);
