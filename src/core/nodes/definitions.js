import { PortTypes } from '../graph/types.js'

export const NodeDefinitions = {
  webhook: {
    type: 'webhook',
    label: 'Webhook Trigger',
    category: 'Triggers',
    color: '#0284c7',
    inputs: [],
    outputs: [
      { id: 'out', name: 'Trigger Payload', type: PortTypes.OBJECT }
    ],
    defaultData: {
      path: '/webhook/event',
      method: 'POST',
      samplePayload: '{\n  "event": "user.signup",\n  "userId": 1042,\n  "email": "user@example.com"\n}'
    },
    schema: [
      {
        key: 'path',
        label: 'Webhook Path',
        type: 'text',
        required: true,
        placeholder: '/webhook/my-flow'
      },
      {
        key: 'method',
        label: 'HTTP Method',
        type: 'select',
        options: ['POST', 'GET', 'PUT', 'DELETE'],
        default: 'POST'
      },
      {
        key: 'samplePayload',
        label: 'Mock Incoming Payload (JSON)',
        type: 'json',
        placeholder: '{"key": "value"}'
      }
    ]
  },

  timer: {
    type: 'timer',
    label: 'Timer / Cron',
    category: 'Triggers',
    color: '#0d9488',
    inputs: [],
    outputs: [
      { id: 'out', name: 'Trigger Flow', type: PortTypes.FLOW }
    ],
    defaultData: {
      cron: '*/5 * * * *',
      intervalSeconds: 300,
      enabled: true
    },
    schema: [
      {
        key: 'cron',
        label: 'Cron Expression',
        type: 'text',
        placeholder: '*/5 * * * *',
        required: true
      },
      {
        key: 'intervalSeconds',
        label: 'Interval (seconds)',
        type: 'number',
        min: 1,
        default: 300
      },
      {
        key: 'enabled',
        label: 'Active On Schedule',
        type: 'boolean',
        default: true
      }
    ]
  },

  http: {
    type: 'http',
    label: 'HTTP Request',
    category: 'Operations',
    color: '#2563eb',
    inputs: [
      { id: 'in', name: 'In', type: PortTypes.FLOW }
    ],
    outputs: [
      { id: 'out', name: 'Response', type: PortTypes.OBJECT },
      { id: 'error', name: 'Error', type: PortTypes.OBJECT }
    ],
    defaultData: {
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      method: 'GET',
      headers: '{\n  "Accept": "application/json"\n}',
      body: '',
      timeout: 5000,
      retries: 2
    },
    schema: [
      {
        key: 'url',
        label: 'Request URL',
        type: 'text',
        placeholder: 'https://api.example.com/v1/resource',
        expressionSupported: true,
        required: true
      },
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'GET'
      },
      {
        key: 'headers',
        label: 'Headers (JSON)',
        type: 'json',
        expressionSupported: true
      },
      {
        key: 'body',
        label: 'Body (JSON or Text)',
        type: 'textarea',
        expressionSupported: true
      },
      {
        key: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        default: 5000
      },
      {
        key: 'retries',
        label: 'Max Retries',
        type: 'number',
        default: 2
      }
    ]
  },

  branch: {
    type: 'branch',
    label: 'IF / Switch Branch',
    category: 'Logic',
    color: '#d97706',
    inputs: [
      { id: 'in', name: 'In', type: PortTypes.FLOW }
    ],
    outputs: [
      { id: 'true', name: 'True Branch', type: PortTypes.FLOW },
      { id: 'false', name: 'False Branch', type: PortTypes.FLOW }
    ],
    defaultData: {
      condition: '{{ $node.in.data.status == 200 || $node.in.data.success == true }}'
    },
    schema: [
      {
        key: 'condition',
        label: 'Branch Condition Expression',
        type: 'expression',
        placeholder: '{{ $input.count > 0 }}',
        required: true,
        expressionSupported: true
      }
    ]
  },

  loop: {
    type: 'loop',
    label: 'Loop / Iterate',
    category: 'Logic',
    color: '#7c3aed',
    inputs: [
      { id: 'in', name: 'In', type: PortTypes.FLOW },
      { id: 'loopBack', name: 'Loop Feedback', type: PortTypes.FLOW }
    ],
    outputs: [
      { id: 'loopBody', name: 'Loop Iteration', type: PortTypes.ANY },
      { id: 'done', name: 'Completed', type: PortTypes.ARRAY }
    ],
    defaultData: {
      itemsExpression: '{{ [1, 2, 3, 4] }}',
      batchSize: 1,
      maxIterations: 50
    },
    schema: [
      {
        key: 'itemsExpression',
        label: 'Items Array Expression',
        type: 'expression',
        placeholder: '{{ $input.items }}',
        required: true,
        expressionSupported: true
      },
      {
        key: 'batchSize',
        label: 'Batch Size',
        type: 'number',
        default: 1
      },
      {
        key: 'maxIterations',
        label: 'Max Iteration Safeguard',
        type: 'number',
        default: 50
      }
    ]
  },

  merge: {
    type: 'merge',
    label: 'Merge Branches',
    category: 'Logic',
    color: '#4f46e5',
    inputs: [
      { id: 'in1', name: 'Branch A', type: PortTypes.FLOW },
      { id: 'in2', name: 'Branch B', type: PortTypes.FLOW }
    ],
    outputs: [
      { id: 'out', name: 'Merged Output', type: PortTypes.OBJECT }
    ],
    defaultData: {
      mode: 'waitAll',
      joinStrategy: 'combineObject'
    },
    schema: [
      {
        key: 'mode',
        label: 'Wait Mode',
        type: 'select',
        options: ['waitAll', 'waitAny'],
        default: 'waitAll'
      },
      {
        key: 'joinStrategy',
        label: 'Data Join Strategy',
        type: 'select',
        options: ['combineObject', 'arrayConcat', 'lastWins'],
        default: 'combineObject'
      }
    ]
  },

  code: {
    type: 'code',
    label: 'JavaScript Code',
    category: 'Operations',
    color: '#059669',
    inputs: [
      { id: 'in', name: 'In', type: PortTypes.ANY }
    ],
    outputs: [
      { id: 'out', name: 'Result', type: PortTypes.ANY },
      { id: 'error', name: 'Error', type: PortTypes.OBJECT }
    ],
    defaultData: {
      code: 'const input = $input || {};\nreturn {\n  processed: true,\n  timestamp: Date.now(),\n  original: input\n};',
      timeoutMs: 2000,
      memoryLimitMb: 16
    },
    schema: [
      {
        key: 'code',
        label: 'JavaScript Code (Sandboxed)',
        type: 'code',
        required: true
      },
      {
        key: 'timeoutMs',
        label: 'Execution Timeout (ms)',
        type: 'number',
        default: 2000
      },
      {
        key: 'memoryLimitMb',
        label: 'Memory Limit (MB)',
        type: 'number',
        default: 16
      }
    ]
  },

  transform: {
    type: 'transform',
    label: 'Set / Transform Data',
    category: 'Transforms',
    color: '#ea580c',
    inputs: [
      { id: 'in', name: 'In', type: PortTypes.ANY }
    ],
    outputs: [
      { id: 'out', name: 'Transformed Data', type: PortTypes.OBJECT }
    ],
    defaultData: {
      assignments: '{\n  "title": "{{ upper($input.name || \\"default title\\") }}",\n  "status": "active",\n  "count": "{{ length($input.items || [1, 2, 3]) }}"\n}',
      mode: 'merge'
    },
    schema: [
      {
        key: 'assignments',
        label: 'Fields Specification (JSON or Expressions)',
        type: 'json',
        expressionSupported: true,
        required: true
      },
      {
        key: 'mode',
        label: 'Output Mode',
        type: 'select',
        options: ['merge', 'replace'],
        default: 'merge'
      }
    ]
  },

  delay: {
    type: 'delay',
    label: 'Delay Pause',
    category: 'Operations',
    color: '#64748b',
    inputs: [
      { id: 'in', name: 'In', type: PortTypes.FLOW }
    ],
    outputs: [
      { id: 'out', name: 'Out', type: PortTypes.FLOW }
    ],
    defaultData: {
      milliseconds: 1000
    },
    schema: [
      {
        key: 'milliseconds',
        label: 'Delay Duration (ms)',
        type: 'number',
        min: 10,
        default: 1000
      }
    ]
  },

  filter: {
    type: 'filter',
    label: 'Filter',
    category: 'Transforms',
    color: '#0891b2',
    inputs: [
      { id: 'in', name: 'In', type: PortTypes.ANY }
    ],
    outputs: [
      { id: 'passed', name: 'Passed', type: PortTypes.ANY },
      { id: 'rejected', name: 'Rejected', type: PortTypes.ANY }
    ],
    defaultData: {
      condition: '{{ $input.active == true || $input.price > 10 }}',
      arrayField: 'items'
    },
    schema: [
      {
        key: 'condition',
        label: 'Filter Predicate Expression',
        type: 'expression',
        expressionSupported: true,
        required: true
      },
      {
        key: 'arrayField',
        label: 'Optional Array Property (leave empty to filter root input)',
        type: 'text',
        placeholder: 'items'
      }
    ]
  },

  error_handler: {
    type: 'error_handler',
    label: 'Error Handler',
    category: 'Logic',
    color: '#e11d48',
    inputs: [
      { id: 'in', name: 'Error In', type: PortTypes.OBJECT }
    ],
    outputs: [
      { id: 'recovered', name: 'Recovered Flow', type: PortTypes.FLOW },
      { id: 'fatal', name: 'Fatal Output', type: PortTypes.OBJECT }
    ],
    defaultData: {
      catchMode: 'fallback',
      fallbackValue: '{\n  "status": "recovered",\n  "message": "Encountered error but recovered"\n}',
      retryMax: 3
    },
    schema: [
      {
        key: 'catchMode',
        label: 'Handling Mode',
        type: 'select',
        options: ['fallback', 'retryThenFallback', 'rethrow'],
        default: 'fallback'
      },
      {
        key: 'fallbackValue',
        label: 'Fallback Payload (JSON)',
        type: 'json'
      },
      {
        key: 'retryMax',
        label: 'Retry Attempts',
        type: 'number',
        default: 3
      }
    ]
  },

  log: {
    type: 'log',
    label: 'Log / Debugger',
    category: 'Output',
    color: '#475569',
    inputs: [
      { id: 'in', name: 'In', type: PortTypes.ANY }
    ],
    outputs: [
      { id: 'out', name: 'Pass Through', type: PortTypes.ANY }
    ],
    defaultData: {
      message: '{{ "Execution check: " + json($input) }}',
      level: 'INFO'
    },
    schema: [
      {
        key: 'message',
        label: 'Log Message Expression',
        type: 'textarea',
        expressionSupported: true
      },
      {
        key: 'level',
        label: 'Severity Level',
        type: 'select',
        options: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
        default: 'INFO'
      }
    ]
  }
}

export function createNode(type, position = { x: 200, y: 200 }) {
  const def = NodeDefinitions[type]
  if (!def) {
    throw new Error(`Unknown node type: ${type}`)
  }

  const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    type,
    label: def.label,
    position,
    data: JSON.parse(JSON.stringify(def.defaultData)),
    inputs: JSON.parse(JSON.stringify(def.inputs)),
    outputs: JSON.parse(JSON.stringify(def.outputs))
  }
}
