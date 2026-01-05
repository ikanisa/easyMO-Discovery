/**
 * Supabase client utility for Worker
 * Implements PostgREST API for querying Supabase
 */

export interface SupabaseQueryBuilder {
  select(columns: string | { count?: 'exact' | 'estimated'; head?: boolean }): SupabaseQueryBuilder;
  eq(column: string, value: any): SupabaseQueryBuilder;
  neq(column: string, value: any): SupabaseQueryBuilder;
  gt(column: string, value: any): SupabaseQueryBuilder;
  gte(column: string, value: any): SupabaseQueryBuilder;
  lt(column: string, value: any): SupabaseQueryBuilder;
  lte(column: string, value: any): SupabaseQueryBuilder;
  ilike(column: string, pattern: string): SupabaseQueryBuilder;
  or(condition: string): SupabaseQueryBuilder;
  limit(count: number): SupabaseQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder;
  insert(data: any | any[]): SupabaseQueryBuilder;
  single(): Promise<{ data: any; error: any }>;
  then(resolve: (value: { data: any; error: any }) => any): Promise<any>;
}

class QueryBuilder implements SupabaseQueryBuilder {
  private url: string;
  private key: string;
  private table: string;
  private params: URLSearchParams;
  private selectColumns: string = '*';
  private selectOptions?: { count?: 'exact' | 'estimated'; head?: boolean };
  private filters: string[] = [];
  private orderBy?: string;
  private limitCount?: number;
  private singleMode: boolean = false;
  private insertData?: any | any[];
  private method: 'GET' | 'POST' = 'GET';

  constructor(url: string, key: string, table: string) {
    this.url = url;
    this.key = key;
    this.table = table;
    this.params = new URLSearchParams();
  }

  select(columns: string | { count?: 'exact' | 'estimated'; head?: boolean }): SupabaseQueryBuilder {
    if (typeof columns === 'string') {
      this.selectColumns = columns;
    } else {
      this.selectOptions = columns;
      this.selectColumns = '*';
    }
    return this;
  }

  eq(column: string, value: any): SupabaseQueryBuilder {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  neq(column: string, value: any): SupabaseQueryBuilder {
    this.filters.push(`${column}=neq.${encodeURIComponent(value)}`);
    return this;
  }

  gt(column: string, value: any): SupabaseQueryBuilder {
    this.filters.push(`${column}=gt.${encodeURIComponent(value)}`);
    return this;
  }

  gte(column: string, value: any): SupabaseQueryBuilder {
    this.filters.push(`${column}=gte.${encodeURIComponent(value)}`);
    return this;
  }

  lt(column: string, value: any): SupabaseQueryBuilder {
    this.filters.push(`${column}=lt.${encodeURIComponent(value)}`);
    return this;
  }

  lte(column: string, value: any): SupabaseQueryBuilder {
    this.filters.push(`${column}=lte.${encodeURIComponent(value)}`);
    return this;
  }

  ilike(column: string, pattern: string): SupabaseQueryBuilder {
    this.filters.push(`${column}=ilike.${encodeURIComponent(pattern)}`);
    return this;
  }

  or(condition: string): SupabaseQueryBuilder {
    this.filters.push(`or=${encodeURIComponent(`(${condition})`)}`);
    return this;
  }

  limit(count: number): SupabaseQueryBuilder {
    this.limitCount = count;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.orderBy = `${column}.${direction}`;
    return this;
  }

  insert(data: any | any[]): SupabaseQueryBuilder {
    this.insertData = data;
    this.method = 'POST';
    return this;
  }

  single(): Promise<{ data: any; error: any }> {
    this.singleMode = true;
    return this.execute();
  }

  async then(resolve: (value: { data: any; error: any }) => any): Promise<any> {
    const result = await this.execute();
    return resolve(result);
  }

  private async execute(): Promise<{ data: any; error: any }> {
    // Handle INSERT
    if (this.insertData) {
      const headers: Record<string, string> = {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      };

      // Add select if specified
      if (this.selectColumns !== '*') {
        headers['Prefer'] = `return=representation,resolution=merge-duplicates`;
        this.params.set('select', this.selectColumns);
      }

      if (this.singleMode) {
        headers['Prefer'] += ',return=representation';
        headers['Accept'] = 'application/vnd.pgjson.object+json';
      }

      const queryUrl = this.params.toString() 
        ? `${this.url}/rest/v1/${this.table}?${this.params.toString()}`
        : `${this.url}/rest/v1/${this.table}`;

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.insertData),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        return { data: null, error: errorBody };
      }

      const data = await response.json();
      return { data, error: null };
    }

    // Handle SELECT/GET
    // Handle count query
    if (this.selectOptions?.count) {
      this.params.set('select', `*,count=${this.selectOptions.count}`);
      if (this.selectOptions.head) {
        // HEAD request for count only
        const queryUrl = `${this.url}/rest/v1/${this.table}?${this.params.toString()}`;
        const response = await fetch(queryUrl, {
          method: 'HEAD',
          headers: {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
          },
        });
        
        const count = response.headers.get('content-range')?.split('/')[1];
        return { data: count ? parseInt(count, 10) : 0, error: null };
      }
    } else {
      this.params.set('select', this.selectColumns);
    }
    
    if (this.filters.length > 0) {
      this.filters.forEach(filter => {
        const [key, value] = filter.split('=');
        this.params.append(key, value);
      });
    }
    
    if (this.orderBy) {
      this.params.append('order', this.orderBy);
    }
    
    if (this.limitCount) {
      this.params.append('limit', this.limitCount.toString());
    }

    const queryUrl = `${this.url}/rest/v1/${this.table}?${this.params.toString()}`;
    const headers: Record<string, string> = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
    };

    if (this.singleMode) {
      headers['Accept'] = 'application/vnd.pgjson.object+json';
    }

    const response = await fetch(queryUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      return { data: null, error: errorBody };
    }

    const data = await response.json();
    return { data, error: null };
  }
}

export function createSupabaseClient(url: string, key: string) {
  return {
    url,
    key,
    
    from(table: string): SupabaseQueryBuilder {
      return new QueryBuilder(url, key, table);
    },
    
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
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        return { data: null, error: errorBody };
      }
      
      const data = await response.json();
      return { data, error: null };
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

