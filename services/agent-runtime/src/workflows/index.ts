/**
 * Agent Builder Workflows
 * 
 * Executes workflows exported from OpenAI Agent Builder.
 * Workflows are JSON definitions with nodes and edges.
 */

import type { Env } from '../types';
import { Logger, generateTraceId } from '../utils/logging';
import { getAgentByType } from '../utils/tools';
import { executeToolCall } from '../utils/tools';
import type { AgentType } from '../types';

export interface WorkflowNode {
  id: string;
  type: 'tool' | 'condition' | 'agent' | 'action' | 'input' | 'output';
  config: Record<string, any>;
  label?: string;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string; // Optional condition for conditional edges
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, any>;
}

export interface WorkflowContext {
  [key: string]: any;
}

export interface WorkflowResult {
  success: boolean;
  output?: any;
  error?: string;
  execution_time_ms: number;
  nodes_executed: string[];
}

/**
 * Execute a workflow
 * 
 * @param workflow - Workflow definition
 * @param initialContext - Initial context/inputs
 * @param env - Environment variables
 * @returns Workflow execution result
 */
export async function executeWorkflow(
  workflow: WorkflowDefinition,
  initialContext: WorkflowContext,
  env: Env
): Promise<WorkflowResult> {
  const startTime = Date.now();
  const traceId = generateTraceId();
  const logger = new Logger(traceId);
  
  logger.info('Starting workflow execution', {
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    version: workflow.version,
  });

  const context: WorkflowContext = { ...initialContext };
  const nodesExecuted: string[] = [];
  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
  const edgesByFrom = new Map<string, WorkflowEdge[]>();
  
  // Build edge map
  for (const edge of workflow.edges) {
    if (!edgesByFrom.has(edge.from)) {
      edgesByFrom.set(edge.from, []);
    }
    edgesByFrom.get(edge.from)!.push(edge);
  }

  try {
    // Find start node (input node or first node)
    let currentNodeId = workflow.nodes.find(n => n.type === 'input')?.id || workflow.nodes[0]?.id;
    
    if (!currentNodeId) {
      throw new Error('Workflow has no nodes');
    }

    // Execute nodes in order
    const visited = new Set<string>();
    
    while (currentNodeId) {
      if (visited.has(currentNodeId)) {
        logger.warn('Circular dependency detected', { node_id: currentNodeId });
        break;
      }
      visited.add(currentNodeId);
      
      const node = nodeMap.get(currentNodeId);
      if (!node) {
        throw new Error(`Node ${currentNodeId} not found`);
      }

      logger.info('Executing workflow node', {
        node_id: currentNodeId,
        node_type: node.type,
        node_label: node.label,
      });

      // Execute node based on type
      let nodeResult: any;
      
      switch (node.type) {
        case 'input':
          // Input node - use initial context
          nodeResult = context;
          break;
        
        case 'tool':
          // Execute tool
          const agentType = (node.config.agent_type || 'router') as AgentType;
          const toolName = node.config.tool_name;
          const toolArgs = node.config.args || {};
          
          // Inject context into tool args
          const resolvedArgs = resolveContextVariables(toolArgs, context);
          
          // Create a mock tool call for execution
          const mockToolCall = {
            id: `tool_${currentNodeId}`,
            type: 'function' as const,
            function: {
              name: toolName,
              arguments: JSON.stringify(resolvedArgs),
            },
          };
          
          const toolResult = await executeToolCall(
            mockToolCall,
            agentType,
            env,
            {
              user_id: context.user_id,
              user_location: context.user_location,
              conversation_id: context.conversation_id,
            }
          );
          
          nodeResult = JSON.parse(toolResult);
          break;
        
        case 'agent':
          // Call agent (simplified - would need full agent execution)
          logger.warn('Agent nodes not fully implemented', { node_id: currentNodeId });
          nodeResult = { message: 'Agent node execution not yet implemented' };
          break;
        
        case 'condition':
          // Evaluate condition
          const condition = node.config.condition;
          const conditionResult = evaluateCondition(condition, context);
          nodeResult = { condition_result: conditionResult };
          break;
        
        case 'action':
          // Execute action (custom logic)
          nodeResult = await executeAction(node.config, context, env);
          break;
        
        case 'output':
          // Output node - return result
          return {
            success: true,
            output: context,
            execution_time_ms: Date.now() - startTime,
            nodes_executed: nodesExecuted,
          };
        
        default:
          logger.warn('Unknown node type', { node_type: node.type });
          nodeResult = {};
      }

      // Store result in context
      const outputKey = node.config.output_key || `node_${currentNodeId}`;
      context[outputKey] = nodeResult;
      nodesExecuted.push(currentNodeId);

      // Find next node(s)
      const nextEdges = edgesByFrom.get(currentNodeId) || [];
      
      if (nextEdges.length === 0) {
        // No more edges - workflow complete
        break;
      }

      // Handle conditional edges
      if (nextEdges.length > 1) {
        // Multiple edges - evaluate conditions
        const matchingEdge = nextEdges.find(edge => {
          if (!edge.condition) return true; // Default path
          return evaluateCondition(edge.condition, context);
        });
        
        currentNodeId = matchingEdge?.to;
      } else {
        // Single edge
        currentNodeId = nextEdges[0].to;
      }
    }

    return {
      success: true,
      output: context,
      execution_time_ms: Date.now() - startTime,
      nodes_executed: nodesExecuted,
    };
  } catch (error: any) {
    logger.error('Workflow execution failed', error);
    return {
      success: false,
      error: error.message || 'Workflow execution failed',
      execution_time_ms: Date.now() - startTime,
      nodes_executed: nodesExecuted,
    };
  }
}

/**
 * Resolve context variables in a value
 * 
 * Example: "${node_1.result}" → context.node_1.result
 */
function resolveContextVariables(value: any, context: WorkflowContext): any {
  if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
    const path = value.slice(2, -1);
    return getNestedValue(context, path);
  }
  
  if (Array.isArray(value)) {
    return value.map(v => resolveContextVariables(v, context));
  }
  
  if (typeof value === 'object' && value !== null) {
    const resolved: any = {};
    for (const [key, val] of Object.entries(value)) {
      resolved[key] = resolveContextVariables(val, context);
    }
    return resolved;
  }
  
  return value;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Evaluate a condition
 * 
 * Example: "node_1.result.count > 5"
 * 
 * Note: This is a simplified evaluator. For production, consider using
 * a safe expression evaluator library.
 */
function evaluateCondition(condition: string, context: WorkflowContext): boolean {
  try {
    // Replace context variables
    let resolvedCondition = condition;
    const variableRegex = /\$\{([^}]+)\}/g;
    resolvedCondition = resolvedCondition.replace(variableRegex, (_, path) => {
      const value = getNestedValue(context, path);
      // Convert to comparable format
      if (typeof value === 'string') {
        return `"${value}"`;
      }
      return String(value);
    });
    
    // Simple comparison evaluation (safer than eval)
    // Support: >, <, >=, <=, ==, !=, ===, !==
    const comparisonMatch = resolvedCondition.match(/^(.+?)\s*(>|>=|<|<=|==|!=|===|!==)\s*(.+)$/);
    if (comparisonMatch) {
      const [, left, operator, right] = comparisonMatch;
      const leftValue = parseValue(left.trim());
      const rightValue = parseValue(right.trim());
      
      switch (operator) {
        case '>': return leftValue > rightValue;
        case '>=': return leftValue >= rightValue;
        case '<': return leftValue < rightValue;
        case '<=': return leftValue <= rightValue;
        case '==': return leftValue == rightValue;
        case '===': return leftValue === rightValue;
        case '!=': return leftValue != rightValue;
        case '!==': return leftValue !== rightValue;
        default: return false;
      }
    }
    
    // For complex conditions, return false (would need proper parser)
    return false;
  } catch {
    return false;
  }
}

/**
 * Parse a value (number, boolean, or string)
 */
function parseValue(value: string): any {
  // Try number
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  
  // Try boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  return value;
}

/**
 * Execute a custom action
 */
async function executeAction(
  config: Record<string, any>,
  context: WorkflowContext,
  env: Env
): Promise<any> {
  const actionType = config.type;
  
  switch (actionType) {
    case 'log':
      console.log('Workflow action log:', config.message, context);
      return { logged: true };
    
    case 'set_context':
      // Set a value in context
      const key = config.key;
      const value = resolveContextVariables(config.value, context);
      context[key] = value;
      return { set: key, value };
    
    default:
      return { action: actionType, status: 'not_implemented' };
  }
}

/**
 * Load workflow from database
 */
export async function loadWorkflow(
  workflowId: string,
  env: Env
): Promise<WorkflowDefinition | null> {
  try {
    const { data, error } = await env.SUPABASE
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      version: data.version,
      description: data.description,
      nodes: data.definition.nodes,
      edges: data.definition.edges,
      metadata: data.definition.metadata,
    };
  } catch (error) {
    console.error('Failed to load workflow:', error);
    return null;
  }
}

