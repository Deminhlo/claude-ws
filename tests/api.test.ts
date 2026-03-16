/**
 * API Test Suite
 * Test file for testing API endpoints with authentication key
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { build } from 'drizzle-kit';
import { eq } from 'drizzle-orm';

// API Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = 'demo-key';

// Test data interfaces
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Attempt {
  id: string;
  projectId: string;
  status: string;
  createdAt: string;
}

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });

  const data = await response.json() as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(`API Error: ${data.error || response.statusText}`);
  }

  return data;
}

describe('API Authentication Tests', () => {
  it('should reject requests without API key', async () => {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'GET',
    });

    expect(response.status).toBe(401);
  });

  it('should reject requests with invalid API key', async () => {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-key',
      },
    });

    expect(response.status).toBe(401);
  });

  it('should accept requests with valid API key (demo-key)', async () => {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer demo-key',
      },
    });

    expect(response.status).toBe(200);
  });
});

describe('Projects API Tests', () => {
  let createdProjectId: string;

  it('should create a new project', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'This is a test project created via API test',
    };

    const response = await apiRequest<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.name).toBe(projectData.name);

    if (response.data?.id) {
      createdProjectId = response.data.id;
    }
  });

  it('should get all projects', async () => {
    const response = await apiRequest<Project[]>('/api/projects');

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should get a specific project by ID', async () => {
    if (!createdProjectId) {
      console.warn('Skipping test: No project ID available');
      return;
    }

    const response = await apiRequest<Project>(`/api/projects/${createdProjectId}`);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.id).toBe(createdProjectId);
  });

  it('should update a project', async () => {
    if (!createdProjectId) {
      console.warn('Skipping test: No project ID available');
      return;
    }

    const updateData = {
      name: 'Updated Test Project',
      description: 'This project has been updated via API test',
    };

    const response = await apiRequest<Project>(`/api/projects/${createdProjectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    expect(response.success).toBe(true);
    expect(response.data?.name).toBe(updateData.name);
  });

  it('should delete a project', async () => {
    if (!createdProjectId) {
      console.warn('Skipping test: No project ID available');
      return;
    }

    const response = await apiRequest(`/api/projects/${createdProjectId}`, {
      method: 'DELETE',
    });

    expect(response.success).toBe(true);
  });
});

describe('Attempts API Tests', () => {
  let testProjectId: string;

  beforeAll(async () => {
    // Create a test project for attempts
    const projectResponse = await apiRequest<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Project for Attempts',
        description: 'Project created for testing attempts API',
      }),
    });

    if (projectResponse.data?.id) {
      testProjectId = projectResponse.data.id;
    }
  });

  afterAll(async () => {
    // Clean up test project
    if (testProjectId) {
      await apiRequest(`/api/projects/${testProjectId}`, {
        method: 'DELETE',
      });
    }
  });

  it('should create a new attempt', async () => {
    if (!testProjectId) {
      console.warn('Skipping test: No project ID available');
      return;
    }

    const attemptData = {
      projectId: testProjectId,
      prompt: 'Test prompt for API testing',
      model: 'claude-sonnet-4-20250514',
    };

    const response = await apiRequest<Attempt>('/api/attempts', {
      method: 'POST',
      body: JSON.stringify(attemptData),
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.projectId).toBe(testProjectId);
  });

  it('should get attempts for a project', async () => {
    if (!testProjectId) {
      console.warn('Skipping test: No project ID available');
      return;
    }

    const response = await apiRequest<Attempt[]>(`/api/projects/${testProjectId}/attempts`);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should get attempt status', async () => {
    // First create an attempt
    if (!testProjectId) {
      console.warn('Skipping test: No project ID available');
      return;
    }

    const createResponse = await apiRequest<Attempt>('/api/attempts', {
      method: 'POST',
      body: JSON.stringify({
        projectId: testProjectId,
        prompt: 'Status test prompt',
        model: 'claude-sonnet-4-20250514',
      }),
    });

    if (!createResponse.data?.id) {
      console.warn('Skipping test: No attempt ID available');
      return;
    }

    const statusResponse = await apiRequest<{ status: string }>(
      `/api/attempts/${createResponse.data.id}/status`
    );

    expect(statusResponse.success).toBe(true);
    expect(statusResponse.data?.status).toBeDefined();
  });
});

describe('Search API Tests', () => {
  it('should search files by glob pattern', async () => {
    const searchQuery = {
      pattern: '**/*.ts',
      path: process.cwd(),
    };

    const response = await apiRequest('/api/search/files', {
      method: 'POST',
      body: JSON.stringify(searchQuery),
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  it('should search content by grep pattern', async () => {
    const searchQuery = {
      pattern: 'import',
      path: process.cwd(),
      filePattern: '*.ts',
    };

    const response = await apiRequest('/api/search/content', {
      method: 'POST',
      body: JSON.stringify(searchQuery),
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });
});

describe('Health Check Tests', () => {
  it('should return healthy status', async () => {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});

describe('Error Handling Tests', () => {
  it('should handle 404 for non-existent endpoints', async () => {
    const response = await apiRequest('/api/non-existent-endpoint');

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });

  it('should handle invalid JSON in request body', async () => {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer demo-key',
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    expect(response.status).toBe(400);
  });

  it('should handle missing required fields', async () => {
    const response = await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({}), // Missing required 'name' field
    });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});

// Run tests if executed directly
if (require.main === module) {
  console.log('Running API tests...');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Using API Key: ${API_KEY}`);
  console.log('Note: Make sure the server is running before executing tests.');
}
