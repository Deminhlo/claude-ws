/**
 * Simple API Test Runner
 * Tests API endpoints with demo-key authentication
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8053';
const API_KEY = 'demo-key';
const PROJECT_PATH = process.cwd();

async function runTests() {
  console.log('🧪 Starting API Tests');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`🔑 Using API Key: ${API_KEY}`);
  console.log(`📁 Project Path: ${PROJECT_PATH}\n`);

  let passedTests = 0;
  let failedTests = 0;

  const tests: Array<{ name: string; fn: () => Promise<void> }> = [
    {
      name: '✗ Authentication: No API Key',
      fn: async () => {
        const response = await fetch(`${API_BASE_URL}/api/search/files`);
        if (response.status !== 401) throw new Error('Should be 401');
        console.log('  ✅ Correctly rejects requests without API key');
      },
    },
    {
      name: '✗ Authentication: Invalid API Key',
      fn: async () => {
        const response = await fetch(`${API_BASE_URL}/api/search/files`, {
          headers: { 'x-api-key': 'invalid-key' },
        });
        if (response.status !== 401) throw new Error('Should be 401');
        console.log('  ✅ Correctly rejects requests with invalid API key');
      },
    },
    {
      name: '✓ Authentication: Valid API Key (demo-key)',
      fn: async () => {
        const url = `${API_BASE_URL}/api/search/files?basePath=${encodeURIComponent(PROJECT_PATH)}&limit=10`;
        const response = await fetch(url, {
          headers: { 'x-api-key': API_KEY },
        });
        if (response.status !== 200) throw new Error('Should be 200');
        console.log('  ✅ Correctly accepts requests with valid API key (demo-key)');
      },
    },
    {
      name: '🔍 Search Files',
      fn: async () => {
        const url = `${API_BASE_URL}/api/search/files?q=ts&basePath=${encodeURIComponent(PROJECT_PATH)}&limit=10`;
        const response = await fetch(url, {
          headers: { 'x-api-key': API_KEY },
        });
        if (!response.ok) throw new Error('Failed to search files');
        const data = await response.json();
        console.log(`  ✅ File search completed: found ${data.total || 0} files`);
      },
    },
    {
      name: '🔍 Search Content',
      fn: async () => {
        const url = `${API_BASE_URL}/api/search/content?q=import&basePath=${encodeURIComponent(PROJECT_PATH)}`;
        const response = await fetch(url, {
          headers: { 'x-api-key': API_KEY },
        });
        if (!response.ok) throw new Error('Failed to search content');
        const data = await response.json();
        console.log(`  ✅ Content search completed: found ${data.totalFiles || 0} files with matches`);
      },
    },
    {
      name: '🗂️ Filesystem Info',
      fn: async () => {
        const url = `${API_BASE_URL}/api/filesystem?path=${encodeURIComponent(PROJECT_PATH)}`;
        const response = await fetch(url, {
          headers: { 'x-api-key': API_KEY },
        });
        if (!response.ok) throw new Error('Failed to get filesystem info');
        const data = await response.json();
        console.log(`  ✅ Filesystem info retrieved: ${data.name || 'unknown'}`);
      },
    },
    {
      name: '📊 Cache Stats',
      fn: async () => {
        const response = await fetch(`${API_BASE_URL}/api/cache-stats`, {
          headers: { 'x-api-key': API_KEY },
        });
        if (!response.ok) throw new Error('Failed to get cache stats');
        const data = await response.json();
        console.log(`  ✅ Cache stats retrieved`);
      },
    },
    {
      name: '🌐 Language Definition',
      fn: async () => {
        const url = `${API_BASE_URL}/api/language/definition?language=typescript`;
        const response = await fetch(url, {
          headers: { 'x-api-key': API_KEY },
        });
        if (!response.ok) throw new Error('Failed to get language definition');
        const data = await response.json();
        console.log(`  ✅ Language definition retrieved: ${data.language || 'typescript'}`);
      },
    },
    {
      name: '🔧 Error Handling: Invalid Path',
      fn: async () => {
        const url = `${API_BASE_URL}/api/search/files?basePath=/invalid/path/that/does/not/exist`;
        const response = await fetch(url, {
          headers: { 'x-api-key': API_KEY },
        });
        if (response.status !== 404) throw new Error('Should be 404 for invalid path');
        console.log('  ✅ Correctly returns 404 for non-existent path');
      },
    },
    {
      name: '🔧 Error Handling: Missing Required Parameter',
      fn: async () => {
        const url = `${API_BASE_URL}/api/search/files?q=test`; // Missing basePath
        const response = await fetch(url, {
          headers: { 'x-api-key': API_KEY },
        });
        if (response.status !== 400) throw new Error('Should be 400 for missing parameter');
        console.log('  ✅ Correctly returns 400 for missing required parameter');
      },
    },
  ];

  for (const test of tests) {
    try {
      process.stdout.write(`${test.name}... `);
      await test.fn();
      passedTests++;
    } catch (error) {
      failedTests++;
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results:`);
  console.log(`   ✅ Passed: ${passedTests}/${tests.length}`);
  console.log(`   ❌ Failed: ${failedTests}/${tests.length}`);
  console.log(`   📈 Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
