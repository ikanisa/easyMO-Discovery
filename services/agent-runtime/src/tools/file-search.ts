/**
 * File Search Tool - Semantic search through business listings using OpenAI Vector Stores
 * 
 * This tool enables agents to search through business listings using semantic search
 * powered by OpenAI's file search with vector stores.
 */

import { OpenAI } from 'openai';
import type { Env } from '../types';

/**
 * Creates a file_search tool that can be added to agent tool arrays.
 * 
 * Requires a vector store to be set up first using setupBusinessVectorStore().
 * The vector store ID is stored in KV and retrieved automatically.
 * 
 * @param env - Environment variables
 * @returns File search tool definition or null if vector store not set up
 */
export async function createFileSearchTool(env: Env): Promise<any | null> {
  const vectorStoreId = await getBusinessVectorStoreId(env);
  
  if (!vectorStoreId) {
    // Vector store not set up yet - return null (tool won't be added)
    return null;
  }
  
  return {
    type: 'file_search' as const,
    file_search: {
      vector_store_ids: [vectorStoreId],
      max_num_results: 10,
    },
  };
}

/**
 * Get business vector store ID from KV
 */
export async function getBusinessVectorStoreId(env: Env): Promise<string | null> {
  if (!env.KV) {
    return null;
  }
  
  try {
    const vectorStoreId = await env.KV.get('business_vector_store_id');
    return vectorStoreId;
  } catch (error) {
    console.error('Failed to get vector store ID from KV:', error);
    return null;
  }
}

/**
 * Setup vector store for business listings
 * 
 * This function:
 * 1. Creates a vector store in OpenAI
 * 2. Fetches all active businesses from Supabase
 * 3. Uploads businesses as files to the vector store
 * 4. Stores the vector store ID in KV
 * 
 * Should be run:
 * - Initially to set up the vector store
 * - Periodically (via cron) to update with new businesses
 * 
 * @param env - Environment variables
 * @returns Vector store ID
 */
export async function setupBusinessVectorStore(env: Env): Promise<string> {
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  
  // Create or get existing vector store
  let vectorStoreId = await getBusinessVectorStoreId(env);
  let vectorStore;
  
  if (!vectorStoreId) {
    // Create new vector store
    vectorStore = await openai.beta.vectorStores.create({
      name: 'easyMO-businesses',
      description: 'Business listings for easyMO Discovery marketplace',
    });
    vectorStoreId = vectorStore.id;
    
    // Store in KV
    if (env.KV) {
      await env.KV.put('business_vector_store_id', vectorStoreId);
    }
  } else {
    // Get existing vector store
    vectorStore = await openai.beta.vectorStores.retrieve(vectorStoreId);
  }
  
  // Fetch all active businesses from Supabase
  const supabase = env.SUPABASE;
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('active', true)
    .limit(10000); // Limit to prevent timeout
  
  if (error || !businesses) {
    throw new Error(`Failed to fetch businesses: ${error?.message || 'Unknown error'}`);
  }
  
  // Batch businesses into files (100 per file to avoid token limits)
  const batchSize = 100;
  const fileIds: string[] = [];
  
  for (let i = 0; i < businesses.length; i += batchSize) {
    const batch = businesses.slice(i, i + batchSize);
    
    // Format businesses as JSONL (one JSON object per line)
    const fileContent = batch.map(b => ({
      id: b.id,
      name: b.name,
      category: b.category,
      description: b.description,
      location: b.location_label,
      phone: b.phone,
      active: b.active,
    })).map(b => JSON.stringify(b)).join('\n');
    
    // Create file
    const file = await openai.files.create({
      file: new Blob([fileContent], { type: 'application/json' }),
      purpose: 'assistants',
    });
    
    fileIds.push(file.id);
    
    // Add to vector store
    await openai.beta.vectorStores.files.create(vectorStore.id, {
      file_id: file.id,
    });
  }
  
  console.log(`Uploaded ${businesses.length} businesses in ${fileIds.length} files to vector store ${vectorStoreId}`);
  
  return vectorStoreId;
}

/**
 * Array of file search tools (for convenience when adding to agents)
 * Note: This is async, so use createFileSearchTool() instead
 */
export const fileSearchTools = []; // Empty - use createFileSearchTool() instead

