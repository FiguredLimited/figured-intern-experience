<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { ref, onMounted, computed } from 'vue';
import FinancialSection from '../components/FinancialSection.vue';

// Types
interface FinancialData {
  company: {
    name: string;
    report_type: string;
    basis: string;
    period: string;
    actuals_to: string;
  };
  columns: Array<{ month: string; type: string }>;
  sections: any[];
  summary: Array<{ name: string; values: number[] }>;
}

// Reactive data
const reportData = ref<FinancialData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const expandedSections = ref<Set<string>>(new Set());

// AI Commentary state
const aiPrompt = ref('');
const aiResponse = ref('');
const aiLoading = ref(false);
const aiError = ref<string | null>(null);

// Computed properties for key metrics
const keyMetrics = computed(() => {
  if (!reportData.value) return null;
  
  const summary = reportData.value.summary;
  const totalCol = reportData.value.columns.length - 1; // Last column is total
  
  // Find key financial metrics
  const netProfit = summary.find(item => item.name === 'Net Profit');
  const operatingSurplus = summary.find(item => item.name === 'Operating Surplus');
  
  // Calculate total income from sections
  const incomeSection = reportData.value.sections.find(section => section.id === 'income');
  const totalIncome = incomeSection?.total?.values[totalCol] || 0;
  
  // Calculate total expenses from sections
  const expenseSection = reportData.value.sections.find(section => section.id === 'operating_expenses');
  const totalExpenses = expenseSection?.total?.values[totalCol] || 0;
  
  return {
    totalIncome,
    totalExpenses,
    netProfit: netProfit?.values[totalCol] || 0,
    operatingSurplus: operatingSurplus?.values[totalCol] || 0,
    grossProfit: incomeSection?.total?.values[totalCol] || 0
  };
});

// Utility functions
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (value < 0) {
    return `($${absValue.toLocaleString()})`;
  }
  return `$${absValue.toLocaleString()}`;
};

const toggleSection = (sectionId: string) => {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId);
  } else {
    expandedSections.value.add(sectionId);
  }
};

const isSectionExpanded = (sectionId: string): boolean => {
  return expandedSections.value.has(sectionId);
};

// Initialize expanded sections
const initializeExpandedSections = () => {
  if (!reportData.value) return;
  
  const processSection = (section: any) => {
    if (section.expanded) {
      expandedSections.value.add(section.id);
    }
    if (section.subsections) {
      section.subsections.forEach(processSection);
    }
  };
  
  reportData.value.sections.forEach(processSection);
};

// Fetch financial report data
const fetchFinancialData = async () => {
  try {
    loading.value = true;
    const response = await fetch('/api/financial-report');
    if (!response.ok) {
      throw new Error('Failed to fetch financial data');
    }
    const data = await response.json();
    reportData.value = data;
    initializeExpandedSections();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
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
    
    const response = await fetch('/api/generate-commentary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      },
      body: JSON.stringify({
        prompt: aiPrompt.value
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate commentary');
    }
    
    const data = await response.json();
    aiResponse.value = data.response || 'No response received';
  } catch (err) {
    aiError.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    aiLoading.value = false;
  }
};

onMounted(() => {
  fetchFinancialData();
});
</script>

<template>
  <Head title="Financial Report - Profit & Loss" />
  
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <Link 
          href="/" 
          class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Home
        </Link>
        <div class="text-sm text-gray-500">🌾 Figured Intern Challenge</div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-24">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p class="text-gray-600 text-lg">Loading financial data...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="max-w-md mx-auto">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div class="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 class="text-red-800 font-semibold text-lg mb-2">Error Loading Financial Data</h2>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button 
            @click="fetchFinancialData"
            class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Financial Report -->
      <div v-else-if="reportData" class="space-y-8">
        
        <!-- Company Header -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-8 py-6 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ reportData.company.name }}</h1>
            <h2 class="text-xl font-semibold text-gray-700 mb-1">{{ reportData.company.report_type }}</h2>
            <div class="text-sm text-gray-600 space-y-1">
              <p>{{ reportData.company.basis }}</p>
              <p>{{ reportData.company.period }}</p>
              <p class="font-medium">Actuals to: {{ reportData.company.actuals_to }}</p>
            </div>
          </div>
        </div>

        <!-- Key Metrics Cards -->
        <div v-if="keyMetrics" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Income</p>
                <p class="text-2xl font-bold" :class="keyMetrics.totalIncome >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ formatCurrency(keyMetrics.totalIncome) }}
                </p>
              </div>
              <div class="text-3xl">📈</div>
            </div>
          </div>
          
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Expenses</p>
                <p class="text-2xl font-bold" :class="keyMetrics.totalExpenses >= 0 ? 'text-red-600' : 'text-green-600'">
                  {{ formatCurrency(keyMetrics.totalExpenses) }}
                </p>
              </div>
              <div class="text-3xl">📉</div>
            </div>
          </div>
          
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Net Profit</p>
                <p class="text-2xl font-bold" :class="keyMetrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ formatCurrency(keyMetrics.netProfit) }}
                </p>
              </div>
              <div class="text-3xl">{{ keyMetrics.netProfit >= 0 ? '💰' : '⚠️' }}</div>
            </div>
          </div>
        </div>

        <!-- Financial Report Table -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Detailed Financial Report</h3>
          </div>
          
          <!-- Table Container -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <!-- Table Header -->
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">
                    Account
                  </th>
                  <th v-for="column in reportData.columns" :key="column.month" 
                      class="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    <div>{{ column.month }}</div>
                    <div class="text-xs font-normal text-gray-400 normal-case">{{ column.type }}</div>
                  </th>
                </tr>
              </thead>
              
              <!-- Table Body -->
              <tbody class="bg-white divide-y divide-gray-200">
                <!-- Render Sections -->
                <template v-for="section in reportData.sections" :key="section.id">
                  <FinancialSection :section="section" :columns="reportData.columns" :level="1" />
                </template>
                
                <!-- Summary Section -->
                <tr class="bg-gray-50 border-t-2 border-gray-300">
                  <td colspan="100%" class="px-6 py-2">
                    <h4 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Summary</h4>
                  </td>
                </tr>
                
                <tr v-for="summaryItem in reportData.summary" :key="summaryItem.name" 
                    class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="px-6 py-3 text-sm font-semibold text-gray-900">
                    {{ summaryItem.name }}
                  </td>
                  <td v-for="(value, index) in summaryItem.values" :key="index" 
                      class="px-3 py-3 text-sm text-right font-semibold"
                      :class="value >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(value) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- AI Commentary Section -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <h3 class="text-blue-900 font-semibold text-lg mb-4 flex items-center">
            🤖 AI Financial Insights
          </h3>
          
          <div class="space-y-4">
            <!-- Quick Insight Buttons -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <button
                @click="aiPrompt = 'Analyze the profitability trends across different farm enterprises'; generateCommentary()"
                :disabled="aiLoading"
                class="text-left p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-300 transition-colors text-sm disabled:opacity-50"
              >
                📊 <strong>Profitability Analysis</strong><br>
                <span class="text-gray-600">Compare enterprise performance</span>
              </button>
              
              <button
                @click="aiPrompt = 'What are the biggest cost drivers and expense patterns in this farm operation?'; generateCommentary()"
                :disabled="aiLoading"
                class="text-left p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-300 transition-colors text-sm disabled:opacity-50"
              >
                💰 <strong>Cost Analysis</strong><br>
                <span class="text-gray-600">Identify expense patterns</span>
              </button>
              
              <button
                @click="aiPrompt = 'Based on the seasonal patterns, what business recommendations would you provide?'; generateCommentary()"
                :disabled="aiLoading"
                class="text-left p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-300 transition-colors text-sm disabled:opacity-50"
              >
                🎯 <strong>Business Insights</strong><br>
                <span class="text-gray-600">Strategic recommendations</span>
              </button>
            </div>

            <div class="bg-white rounded-lg p-4 border border-blue-100">
              <label for="ai-prompt" class="block text-sm font-medium text-blue-800 mb-2">
                Or ask your own question:
              </label>
              <input
                id="ai-prompt"
                v-model="aiPrompt"
                type="text"
                placeholder="e.g., What are the key trends in this farm's financial performance?"
                class="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :disabled="aiLoading"
                @keyup.enter="generateCommentary"
              >
            </div>
            
            <button
              @click="generateCommentary"
              :disabled="!aiPrompt.trim() || aiLoading"
              class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {{ aiLoading ? 'Analyzing...' : 'Generate Insights' }}
            </button>
            
            <div v-if="aiError" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-red-800 text-sm">{{ aiError }}</p>
            </div>
            
            <div v-if="aiResponse" class="bg-white border border-blue-200 rounded-lg p-4">
              <h4 class="font-semibold text-blue-800 mb-3 flex items-center">
                💡 AI Analysis
              </h4>
              <div class="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{{ aiResponse }}</div>
            </div>
          </div>
        </div>

        <!-- Report Summary Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-medium text-gray-700 mb-2">Key Highlights</h4>
              <ul class="text-sm text-gray-600 space-y-1">
                <li>• Report covers {{ reportData.columns.length - 1 }} months of data</li>
                <li>• Includes {{ reportData.sections.length }} main financial categories</li>
                <li>• Combines actual and forecast data</li>
                <li>• Generated on {{ new Date().toLocaleDateString() }}</li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium text-gray-700 mb-2">Data Breakdown</h4>
              <div class="text-sm text-gray-600 space-y-1">
                <div class="flex justify-between">
                  <span>Actuals to:</span>
                  <span class="font-medium">{{ reportData.company.actuals_to }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Report Basis:</span>
                  <span class="font-medium">{{ reportData.company.basis }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Period:</span>
                  <span class="font-medium">12 months</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>