// Determine API URL dynamically
const getApiUrl = (): string => {
  // Server-side: use environment variable or default
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  
  // Client-side: use same host as frontend but with port 3001
  const currentHost = window.location.hostname;
  const protocol = window.location.protocol;
  
  // If accessing via localhost, use localhost
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return `${protocol}//${currentHost}:3001`;
  }
  
  // If accessing via IP or domain, use the same host with backend port
  return `${protocol}//${currentHost}:3001`;
};

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private token: string | null = null;

  private getBaseUrl(): string {
    return getApiUrl();
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const baseUrl = this.getBaseUrl();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  }

  // Auth
  async login(username: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Products
  async getProducts(params?: { search?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<any[]>(`/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id: number) {
    return this.request<any>(`/products/${id}`);
  }

  async getProductByQR(qrCode: string) {
    return this.request<any>(`/products/qr/${qrCode}`);
  }

  async createProduct(data: { name: string; sku: string; price: number; stock?: number }) {
    return this.request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: number, data: { name: string; sku: string; price: number }) {
    return this.request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: number) {
    return this.request<any>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Stock
  async addStock(productId: number, quantity: number, note?: string) {
    return this.request<any>('/stock/in', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, note }),
    });
  }

  async reduceStock(productId: number, quantity: number, note?: string) {
    return this.request<any>('/stock/out', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, note }),
    });
  }

  async scanQR(qrCode: string) {
    return this.request<any>('/stock/scan', {
      method: 'POST',
      body: JSON.stringify({ qrCode }),
    });
  }

  async getStockLogs(params?: { productId?: number; type?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.productId) searchParams.set('productId', params.productId.toString());
    if (params?.type) searchParams.set('type', params.type);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<any[]>(`/stock/logs${query ? `?${query}` : ''}`);
  }

  async getStockReport() {
    return this.request<any>('/stock/report');
  }
}

export const api = new ApiClient();
