const API_BASE_URL = "http://localhost:8080";

export interface User {
  id: number;
  username: string;
  files: FileItem[];
}

export interface FileItem {
  id: number;
  name: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  token: string;
  token_type: string;
  files: FileItem[];
}

export interface LoginResponse {
  access_token: string;
}

export interface AuthError {
  detail: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", token);
      }
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
    return this.token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async register(username: string, password: string): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }

    const data: RegisterResponse = await response.json();
    this.setToken(data.token);
    return data;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data: LoginResponse = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch user");
    }

    return response.json();
  }

  createChatWebSocket(): WebSocket {
    const token = this.getToken();
    const url = `ws://localhost:8080/chat?token=${token}`;

    console.log("TOKEN =", token);
    console.log("WS URL =", url);

    const ws = new WebSocket(url);
    return ws;
  }

  async uploadFile(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "File upload failed");
    }

    return response.json();
  }

  logout() {
    this.setToken(null);
  }
}

export const apiClient = new ApiClient();
