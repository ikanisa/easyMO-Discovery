/**
 * Supabase client utility for Worker
 */

export function createSupabaseClient(url: string, key: string) {
  return {
    url,
    key,
    
    async query(table: string, options: {
      select?: string;
      eq?: Record<string, any>;
      limit?: number;
    }) {
      const params = new URLSearchParams();
      if (options.select) params.append('select', options.select);
      if (options.limit) params.append('limit', options.limit.toString());
      
      let queryUrl = `${url}/rest/v1/${table}?${params.toString()}`;
      
      if (options.eq) {
        for (const [key, value] of Object.entries(options.eq)) {
          queryUrl += `&${key}=eq.${encodeURIComponent(value)}`;
        }
      }
      
      const response = await fetch(queryUrl, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Supabase query failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async rpc(functionName: string, params: Record<string, any>) {
      const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`Supabase RPC failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    async upsert(table: string, data: Record<string, any>, conflictColumn: string = 'id') {
      const response = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': `resolution=merge-duplicates,return=representation`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Supabase upsert failed: ${response.statusText}`);
      }
      
      return response.json();
    },
  };
}

