<script setup lang="ts">
import { Head, Link } from "@inertiajs/vue3";
import { ref, onMounted } from "vue";

// Reactive data
const reportData = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// AI Commentary state
const aiPrompt = ref("");
const aiResponse = ref("");
const aiLoading = ref(false);
const aiError = ref<string | null>(null);

// Fetch financial report data
const fetchFinancialData = async () => {
	try {
		loading.value = true;
		const response = await fetch("/api/financial-report");
		if (!response.ok) {
			throw new Error("Failed to fetch financial data");
		}
		const data = await response.json();
		reportData.value = data;
	} catch (err) {
		error.value = err instanceof Error ? err.message : "An error occurred";
	} finally {
		loading.value = false;
	}
};

// Generate AI commentary
const generateCommentary = async () => {
	if (!aiPrompt.value.trim()) return;

	try {
		aiLoading.value = true;
		aiError.value = null;

		const response = await fetch("/api/generate-commentary", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-TOKEN":
					document
						.querySelector('meta[name="csrf-token"]')
						?.getAttribute("content") || "",
			},
			body: JSON.stringify({
				prompt: aiPrompt.value,
			}),
		});

		if (!response.ok) {
			throw new Error("Failed to generate commentary");
		}

		const data = await response.json();
		aiResponse.value = data.response || "No response received";
	} catch (err) {
		aiError.value = err instanceof Error ? err.message : "An error occurred";
	} finally {
		aiLoading.value = false;
	}
};

onMounted(() => {
	fetchFinancialData();
});
</script>

<template>
  <Head title="Financial Report Challenge" />
  
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <Link 
          href="/" 
          class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          ← Back to Home
        </Link>
        
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          🌾 Figured Financial Report Challenge
        </h1>
        <p class="text-gray-600">
          Transform this basic data display into a beautiful, interactive financial report!
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span class="ml-4 text-gray-600">Loading financial data...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 class="text-red-800 font-semibold mb-2">Error Loading Data</h2>
        <p class="text-red-600">{{ error }}</p>
        <button 
          @click="fetchFinancialData"
          class="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>

      <!-- Basic Report Display -->
      <div v-else-if="reportData" class="space-y-8">

        <!-- Company Info -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="p-4">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">{{ reportData.company.name }}</h2>
            <div class="text-sm text-gray-600">{{ reportData.company.report_type }}</div>
            <div class="text-sm text-gray-600">Data up to <p class="font-bold">{{ reportData.company.actuals_to }}</p></div>
          </div>
          <table class="table-auto w-full text-sm">
            <thead>
              <tr>
                <th class="text-left">Account</th>
                <th v-for="column in reportData.columns" :key="column.month" class="text-right">{{ column.month }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="section in reportData.sections" v-bind:key="section.name">
                <tr>
                  <td class="font-bold text-gray-800 bg-gray-50" :colspan="reportData.columns.length + 1">{{ section.name }}</td>
                </tr>
                <template v-for="subsection in section.subsections" v-bind:key="subsection.name">
                  <tr>
                    <td class="pl-4 font-semibold text-gray-700 bg-gray-100" :colspan="reportData.columns.length + 1">{{ subsection.name }}</td>
                  </tr>
                  <template v-for="subsub in subsection.subsections || []" v-bind:key="subsub.name">
                    <tr>
                      <td class="pl-8 font-medium text-gray-600 bg-gray-50" :colspan="reportData.columns.length + 1">{{ subsub.name }}</td>
                    </tr>
                    <template v-for="item in subsub.line_items || []" v-bind:key="item.name">
                      <tr>
                        <td class="pl-12">{{ item.name }}</td>
                        <td v-for="(value, idx) in item.values" :key="idx" class="text-right" :class="{ 'text-red-600': value < 0 }">{{ value.toLocaleString() }}</td>
                      </tr>
                    </template>
                  </template>
                  <template v-for="item in subsection.line_items || []" v-bind:key="item.name">
                    <tr>
                      <td class="pl-8">{{ item.name }}</td>
                      <td v-for="(value, idx) in item.values" :key="idx" class="text-right" :class="{ 'text-red-600': value < 0 }">{{ value.toLocaleString() }}</td>
                    </tr>
                  </template>
                </template>
                <tr>
                  <td class="font-bold text-gray-900 bg-blue-50">{{ section.total.name }}</td>
                  <td v-for="(value, idx) in section.total.values" :key="idx" class="text-right font-bold" :class="{ 'text-red-600': value < 0 }">{{ value.toLocaleString() }}</td>
                </tr>
              </template>
              <tr v-for="summary in reportData.summary" :key="summary.name">
                <td class="font-bold text-green-900 bg-green-50">{{ summary.name }}</td>
                <td v-for="(value, idx) in summary.values" :key="idx" class="text-right font-bold" :class="{ 'text-red-600': value < 0 }">{{ value.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Challenge Instructions -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 class="text-blue-900 font-semibold text-lg mb-3">🎯 Your Challenge</h3>
          <div class="text-blue-800 space-y-2">
            <p>Build a complete, interactive Profit & Loss report using the provided financial data.</p>
            <p>The data is available in <code class="bg-blue-100 px-1 rounded">reportData</code> - explore it and create a professional financial report interface.</p>
          </div>
        </div>

        <!-- AI Commentary Demo -->
        <div class="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 class="text-green-900 font-semibold text-lg mb-3">🤖 AI Commentary (Prism Demo)</h3>
          
          <div class="space-y-4">
            <div>
              <label for="ai-prompt" class="block text-sm font-medium text-green-800 mb-2">
                Ask AI a question:
              </label>
              <input
                id="ai-prompt"
                v-model="aiPrompt"
                type="text"
                placeholder="e.g., What are some general business insights?"
                class="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                :disabled="aiLoading"
              >
            </div>
            
            <button
              @click="generateCommentary"
              :disabled="!aiPrompt.trim() || aiLoading"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ aiLoading ? 'Generating...' : 'Generate Commentary' }}
            </button>
            
            <div v-if="aiError" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-red-800 text-sm">{{ aiError }}</p>
            </div>
            
            <div v-if="aiResponse" class="bg-white border border-green-200 rounded-lg p-4">
              <h4 class="font-medium text-green-800 mb-2">AI Response:</h4>
              <p class="text-gray-700 text-sm whitespace-pre-wrap">{{ aiResponse }}</p>
            </div>
          </div>
        </div>

        <!-- Challenge Links -->
        <div class="text-center py-8 border-t border-gray-200">
          <div class="space-x-4">
            <a 
              href="/CHALLENGE.md" 
              target="_blank"
              class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center"
            >
              📋 Challenge Requirements
            </a>
            <a 
              href="/api/financial-report" 
              target="_blank"
              class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 inline-flex items-center"
            >
              🔗 API Data
            </a>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>