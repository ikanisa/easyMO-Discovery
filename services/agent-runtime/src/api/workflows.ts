/**
 * Workflow API Endpoint
 * 
 * Handles workflow execution requests
 * 
 * Route: /api/workflows/:id/execute
 * Method: POST
 */

import type { Env } from '../types';
import { Logger, generateTraceId } from '../utils/logging';
import { executeWorkflow, loadWorkflow } from '../workflows';
import { getOrCreateConversation } from '../utils/persistence';

/**
 * Handle workflow execution request
 */
export async function handleWorkflowExecution(
  request: Request,
  env: Env,
  workflowId: string
): Promise<Response> {
  const traceId = generateTraceId();
  const logger = new Logger(traceId);
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Load workflow
    const workflow = await loadWorkflow(workflowId, env);
    
    if (!workflow) {
      return new Response(
        JSON.stringify({ error: 'Workflow not found or inactive' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { context = {}, user_id, conversation_id } = body;

    // Create or get conversation if needed
    let finalConversationId = conversation_id;
    if (user_id && !finalConversationId) {
      finalConversationId = await getOrCreateConversation(
        {
          user_id,
          agent_type: 'router', // Workflows use router agent
          title: `Workflow: ${workflow.name}`,
          channel: 'chat',
        },
        undefined,
        env
      );
    }

    // Add conversation context
    const workflowContext = {
      ...context,
      user_id,
      conversation_id: finalConversationId,
    };

    // Execute workflow
    logger.info('Executing workflow', {
      workflow_id: workflowId,
      workflow_name: workflow.name,
      version: workflow.version,
    });

    const result = await executeWorkflow(workflow, workflowContext, env);

    // Save execution record
    if (user_id) {
      await env.SUPABASE.from('workflow_executions').insert({
        workflow_id: workflowId,
        workflow_version: workflow.version,
        user_id,
        status: result.success ? 'completed' : 'failed',
        context: workflowContext,
        result: result.output,
        completed_at: new Date().toISOString(),
        execution_time_ms: result.execution_time_ms,
        error_message: result.error,
      });
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        output: result.output,
        execution_time_ms: result.execution_time_ms,
        nodes_executed: result.nodes_executed,
        workflow_id: workflowId,
        workflow_name: workflow.name,
        workflow_version: workflow.version,
      }),
      {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    logger.error('Workflow execution error', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Workflow execution failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * List available workflows
 */
export async function handleWorkflowList(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { data, error } = await env.SUPABASE
      .from('workflows')
      .select('id, name, version, description, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        workflows: data || [],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to list workflows',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

