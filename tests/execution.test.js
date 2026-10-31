import { describe, it, expect } from 'vitest'
import { WorkflowEngine, ExecutionStatus } from '../src/core/execution/engine.js'
import { generateBenchmarkWorkflow } from '../src/core/graph/performance.js'

describe('Workflow Execution Engine', () => {
  it('executes linear workflows in topological order', async () => {
    const workflow = {
      nodes: [
        {
          id: 'n1',
          type: 'transform',
          data: { assignments: '{"init": 10}', mode: 'replace' }
        },
        {
          id: 'n2',
          type: 'transform',
          data: { assignments: '{"total": "{{ $input.init + 5 }}"}', mode: 'replace' }
        }
      ],
      connections: [
        { id: 'c1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' }
      ]
    }

    const statuses = []
    const engine = new WorkflowEngine(workflow, {
      onStatusUpdate: (nodeId, status) => {
        statuses.push({ nodeId, status })
      }
    })

    const result = await engine.execute()
    expect(result.statuses.n1).toBe(ExecutionStatus.SUCCESS)
    expect(result.statuses.n2).toBe(ExecutionStatus.SUCCESS)
    expect(result.outputs.n2.total).toBe(15)
  })

  it('handles branching conditions correctly', async () => {
    const workflow = {
      nodes: [
        {
          id: 'trigger',
          type: 'webhook',
          data: { samplePayload: '{"role": "admin"}' }
        },
        {
          id: 'if_node',
          type: 'branch',
          data: { condition: '{{ $input.role == "admin" }}' }
        },
        {
          id: 'admin_action',
          type: 'transform',
          data: { assignments: '{"permitted": true}' }
        },
        {
          id: 'user_action',
          type: 'transform',
          data: { assignments: '{"permitted": false}' }
        }
      ],
      connections: [
        { id: 'c1', source: 'trigger', sourceHandle: 'out', target: 'if_node', targetHandle: 'in' },
        { id: 'c2', source: 'if_node', sourceHandle: 'true', target: 'admin_action', targetHandle: 'in' },
        { id: 'c3', source: 'if_node', sourceHandle: 'false', target: 'user_action', targetHandle: 'in' }
      ]
    }

    const engine = new WorkflowEngine(workflow)
    const result = await engine.execute()

    expect(result.statuses.admin_action).toBe(ExecutionStatus.SUCCESS)
    expect(result.statuses.user_action).toBe(ExecutionStatus.PENDING)
  })

  it('routes node failures to connected error handlers', async () => {
    const workflow = {
      nodes: [
        {
          id: 'flaky_node',
          type: 'code',
          data: {
            code: 'throw new Error("Simulated failure in calculation");',
            retries: 1
          }
        },
        {
          id: 'catch_node',
          type: 'error_handler',
          data: {
            fallbackValue: '{"status": "recovered_successfully"}'
          }
        }
      ],
      connections: [
        { id: 'c_err', source: 'flaky_node', sourceHandle: 'error', target: 'catch_node', targetHandle: 'in' }
      ]
    }

    const engine = new WorkflowEngine(workflow)
    const result = await engine.execute()

    expect(result.statuses.flaky_node).toBe(ExecutionStatus.FAILED)
    expect(result.statuses.catch_node).toBe(ExecutionStatus.SUCCESS)
    expect(result.outputs.catch_node.recovered).toBe(true)
  })

  it('executes a 500-node workflow orchestration under 300ms', async () => {
    const { nodes, connections } = generateBenchmarkWorkflow(500)
    const workflow = { nodes, connections }

    const engine = new WorkflowEngine(workflow, {
      mockHttp: true
    })

    const startTime = performance.now()
    const result = await engine.execute()
    const duration = performance.now() - startTime

    expect(result.duration).toBeLessThan(300)
    expect(Object.keys(result.statuses).length).toBe(500)
  })
})
