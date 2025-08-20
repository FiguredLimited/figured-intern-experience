<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { computed, onMounted, ref } from 'vue';
import type { FinancialReport } from '../types/financial';

// Reactive data
const reportData = ref<FinancialReport | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// AI Commentary state
const aiPrompt = ref('');
const aiResponse = ref('');
const aiLoading = ref(false);
const aiError = ref<string | null>(null);
const showAIPanel = ref(false);

// Collapsible state management
const expandedSections = ref<Set<string>>(new Set());

// Initialize all sections as expanded
const initializeExpandedSections = (data: FinancialReport) => {
    data.sections.forEach((section) => {
        if (section.expanded) expandedSections.value.add(section.id);
        section.subsections.forEach((subsection) => {
            if (subsection.expanded) expandedSections.value.add(subsection.id);
            if (subsection.subsections) {
                subsection.subsections.forEach((sub) => {
                    if (sub.expanded) expandedSections.value.add(sub.id);
                });
            }
        });
    });
};

// Toggle section expansion
const toggleSection = (sectionId: string) => {
    if (expandedSections.value.has(sectionId)) {
        expandedSections.value.delete(sectionId);
    } else {
        expandedSections.value.add(sectionId);
    }
};

// Format currency
const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(absValue);

    if (value < 0) {
        return `(${formatted})`;
    }
    return formatted;
};

// Get cell color class based on value
const getCellClass = (value: number, isTotal: boolean = false): string => {
    const baseClass = isTotal ? 'font-semibold' : '';
    if (value < 0) {
        return `${baseClass} text-red-600`;
    } else if (value > 0) {
        return `${baseClass} text-gray-900`;
    }
    return `${baseClass} text-gray-500`;
};

// Calculate key metrics
const keyMetrics = computed(() => {
    if (!reportData.value) return null;

    const summary = reportData.value.summary;
    const totalColumn = reportData.value.columns.length - 1;

    // Get totals from the summary
    const netProfit = summary.find((item) => item.name === 'Net Profit');
    const operatingSurplus = summary.find((item) => item.name === 'Operating Surplus');

    // Get gross profit from sections
    const incomeSection = reportData.value.sections.find((s) => s.id === 'income');
    const grossProfit = incomeSection?.total;

    return {
        grossProfit: grossProfit ? grossProfit.values[totalColumn] : 0,
        operatingSurplus: operatingSurplus ? operatingSurplus.values[totalColumn] : 0,
        netProfit: netProfit ? netProfit.values[totalColumn] : 0,
    };
});

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
        initializeExpandedSections(data);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'An error occurred';
    } finally {
        loading.value = false;
    }
};

// Generate AI commentary
const generateCommentary = async () => {
    if (!aiPrompt.value.trim() || !reportData.value) return;

    try {
        aiLoading.value = true;
        aiError.value = null;

        // Pass the entire data as context
        const enhancedPrompt = `
You are a financial analyst AI assistant. Analyze the following complete financial data and answer the user's question.

COMPANY INFORMATION:
Company: ${reportData.value.company.name}
Report Type: ${reportData.value.company.report_type}
Period: ${reportData.value.company.period}
Basis: ${reportData.value.company.basis}

COMPLETE FINANCIAL DATA:
${JSON.stringify(reportData.value, null, 2)}

USER QUESTION: ${aiPrompt.value}

Please provide a detailed analysis based on the complete financial data above.
        `;

        const response = await fetch('/api/generate-commentary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                prompt: enhancedPrompt,
                financialData: reportData.value, // Optionally send as structured data
            }),
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
    <Head title="Profit & Loss Report" />

    <div class="min-h-screen bg-gray-50">
        <!-- Professional Header -->
        <div class="border-b border-gray-200 bg-white shadow-sm">
            <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between">
                    <Link href="/" class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"> ← Back to Home </Link>
                    <button
                        @click="showAIPanel = !showAIPanel"
                        class="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
                    >
                        <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                        </svg>
                        AI Insights
                    </button>
                </div>
            </div>
        </div>

        <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                <span class="ml-4 text-gray-600">Loading financial data...</span>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-6">
                <h2 class="mb-2 font-semibold text-red-800">Error Loading Data</h2>
                <p class="text-red-600">{{ error }}</p>
                <button @click="fetchFinancialData" class="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700">Try Again</button>
            </div>

            <!-- Main Report -->
            <div v-else-if="reportData" class="space-y-6">
                <!-- Report Header -->
                <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div class="flex items-start justify-between">
                        <div>
                            <h1 class="mb-2 text-3xl font-bold text-gray-900">{{ reportData.company.name }}</h1>
                            <h2 class="mb-1 text-xl text-gray-700">{{ reportData.company.report_type }}</h2>
                            <p class="text-sm text-gray-600">{{ reportData.company.period }}</p>
                            <p class="text-sm text-gray-500">{{ reportData.company.basis }} | Actuals to {{ reportData.company.actuals_to }}</p>
                        </div>
                        <div class="text-right">
                            <img src="/api/placeholder/120/40" alt="Logo" class="h-10" />
                        </div>
                    </div>
                </div>

                <!-- Key Metrics Cards -->
                <div v-if="keyMetrics" class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium tracking-wider text-gray-600 uppercase">Gross Profit</p>
                                <p class="mt-2 text-3xl font-bold" :class="getCellClass(keyMetrics.grossProfit, true)">
                                    ${{ formatCurrency(keyMetrics.grossProfit) }}
                                </p>
                            </div>
                            <div class="rounded-lg bg-green-50 p-3">
                                <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium tracking-wider text-gray-600 uppercase">Operating Surplus</p>
                                <p class="mt-2 text-3xl font-bold" :class="getCellClass(keyMetrics.operatingSurplus, true)">
                                    ${{ formatCurrency(keyMetrics.operatingSurplus) }}
                                </p>
                            </div>
                            <div class="rounded-lg bg-blue-50 p-3">
                                <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium tracking-wider text-gray-600 uppercase">Net Profit</p>
                                <p class="mt-2 text-3xl font-bold" :class="getCellClass(keyMetrics.netProfit, true)">
                                    ${{ formatCurrency(keyMetrics.netProfit) }}
                                </p>
                            </div>
                            <div class="rounded-lg bg-indigo-50 p-3">
                                <svg class="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Financial Data Table -->
                <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <!-- Table Header -->
                            <thead class="bg-gray-50">
                                <tr>
                                    <th
                                        class="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                                    >
                                        Account
                                    </th>
                                    <th
                                        v-for="(column, index) in reportData.columns"
                                        :key="index"
                                        class="px-4 py-3 text-right text-xs font-medium tracking-wider uppercase"
                                        :class="{
                                            'text-gray-500': column.type === 'Actual',
                                            'text-blue-600': column.type === 'Forecast',
                                            'bg-gray-100 font-bold text-gray-900': column.type === 'Total',
                                        }"
                                    >
                                        {{ column.month }}
                                    </th>
                                </tr>
                            </thead>

                            <!-- Table Body -->
                            <tbody class="divide-y divide-gray-200 bg-white">
                                <!-- Sections -->
                                <template v-for="section in reportData.sections" :key="section.id">
                                    <!-- Section Header -->
                                    <tr class="bg-gray-50 hover:bg-gray-100">
                                        <td class="cursor-pointer px-6 py-3 text-sm font-semibold text-gray-900" @click="toggleSection(section.id)">
                                            <div class="flex items-center">
                                                <svg
                                                    class="mr-2 h-4 w-4 transition-transform"
                                                    :class="{ 'rotate-90': expandedSections.has(section.id) }"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fill-rule="evenodd"
                                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                        clip-rule="evenodd"
                                                    />
                                                </svg>
                                                {{ section.name }}
                                            </div>
                                        </td>
                                        <td v-for="(_, index) in reportData.columns" :key="index" class="px-4 py-3"></td>
                                    </tr>

                                    <!-- Section Content (when expanded) -->
                                    <template v-if="expandedSections.has(section.id)">
                                        <!-- Subsections -->
                                        <template v-for="subsection in section.subsections" :key="subsection.id">
                                            <!-- Subsection Header -->
                                            <tr class="hover:bg-gray-50">
                                                <td
                                                    class="cursor-pointer px-6 py-2 text-sm font-medium text-gray-800"
                                                    @click="toggleSection(subsection.id)"
                                                >
                                                    <div class="flex items-center pl-6">
                                                        <svg
                                                            class="mr-2 h-3 w-3 transition-transform"
                                                            :class="{ 'rotate-90': expandedSections.has(subsection.id) }"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fill-rule="evenodd"
                                                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                                clip-rule="evenodd"
                                                            />
                                                        </svg>
                                                        {{ subsection.name }}
                                                    </div>
                                                </td>
                                                <td v-for="(_, index) in reportData.columns" :key="index" class="px-4 py-2"></td>
                                            </tr>

                                            <!-- Subsection Content (when expanded) -->
                                            <template v-if="expandedSections.has(subsection.id)">
                                                <!-- Level 3 Subsections -->
                                                <template v-if="subsection.subsections">
                                                    <template v-for="subSubsection in subsection.subsections" :key="subSubsection.id">
                                                        <!-- Level 3 Header -->
                                                        <tr class="hover:bg-gray-50">
                                                            <td
                                                                class="cursor-pointer px-6 py-2 text-sm text-gray-700"
                                                                @click="toggleSection(subSubsection.id)"
                                                            >
                                                                <div class="flex items-center pl-12">
                                                                    <svg
                                                                        class="mr-2 h-3 w-3 transition-transform"
                                                                        :class="{ 'rotate-90': expandedSections.has(subSubsection.id) }"
                                                                        fill="currentColor"
                                                                        viewBox="0 0 20 20"
                                                                    >
                                                                        <path
                                                                            fill-rule="evenodd"
                                                                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                                            clip-rule="evenodd"
                                                                        />
                                                                    </svg>
                                                                    {{ subSubsection.name }}
                                                                </div>
                                                            </td>
                                                            <td v-for="(_, index) in reportData.columns" :key="index" class="px-4 py-2"></td>
                                                        </tr>

                                                        <!-- Line Items -->
                                                        <template v-if="expandedSections.has(subSubsection.id) && subSubsection.line_items">
                                                            <tr
                                                                v-for="item in subSubsection.line_items"
                                                                :key="item.account_id"
                                                                class="hover:bg-gray-50"
                                                            >
                                                                <td class="px-6 py-2 text-sm text-gray-600">
                                                                    <div class="pl-20">{{ item.name }}</div>
                                                                </td>
                                                                <td
                                                                    v-for="(value, index) in item.values"
                                                                    :key="index"
                                                                    class="px-4 py-2 text-right text-sm"
                                                                    :class="getCellClass(value, index === item.values.length - 1)"
                                                                >
                                                                    {{ value === 0 ? '-' : formatCurrency(value) }}
                                                                </td>
                                                            </tr>
                                                        </template>
                                                    </template>
                                                </template>

                                                <!-- Direct Line Items -->
                                                <template v-if="subsection.line_items">
                                                    <tr v-for="item in subsection.line_items" :key="item.account_id" class="hover:bg-gray-50">
                                                        <td class="px-6 py-2 text-sm text-gray-600">
                                                            <div class="pl-12">{{ item.name }}</div>
                                                        </td>
                                                        <td
                                                            v-for="(value, index) in item.values"
                                                            :key="index"
                                                            class="px-4 py-2 text-right text-sm"
                                                            :class="getCellClass(value, index === item.values.length - 1)"
                                                        >
                                                            {{ value === 0 ? '-' : formatCurrency(value) }}
                                                        </td>
                                                    </tr>
                                                </template>

                                                <!-- Subsection Gross Profit -->
                                                <tr v-if="subsection.gross_profit" class="bg-blue-50 font-medium">
                                                    <td class="px-6 py-2 text-sm text-gray-900">
                                                        <div class="pl-6">{{ subsection.gross_profit.name }}</div>
                                                    </td>
                                                    <td
                                                        v-for="(value, index) in subsection.gross_profit.values"
                                                        :key="index"
                                                        class="px-4 py-2 text-right text-sm"
                                                        :class="getCellClass(value, true)"
                                                    >
                                                        {{ formatCurrency(value) }}
                                                    </td>
                                                </tr>
                                            </template>
                                        </template>

                                        <!-- Section Total -->
                                        <tr v-if="section.total" class="bg-indigo-50 font-semibold">
                                            <td class="px-6 py-3 text-sm text-gray-900">
                                                {{ section.total.name }}
                                            </td>
                                            <td
                                                v-for="(value, index) in section.total.values"
                                                :key="index"
                                                class="px-4 py-3 text-right text-sm"
                                                :class="getCellClass(value, true)"
                                            >
                                                {{ formatCurrency(value) }}
                                            </td>
                                        </tr>
                                    </template>
                                </template>

                                <!-- Summary Section -->
                                <tr class="bg-gray-100">
                                    <td colspan="14" class="px-6 py-2 text-sm font-semibold text-gray-900">Summary</td>
                                </tr>
                                <tr v-for="summaryItem in reportData.summary" :key="summaryItem.name" class="bg-yellow-50 font-bold">
                                    <td class="px-6 py-3 text-sm text-gray-900">
                                        {{ summaryItem.name }}
                                    </td>
                                    <td
                                        v-for="(value, index) in summaryItem.values"
                                        :key="index"
                                        class="px-4 py-3 text-right text-sm"
                                        :class="getCellClass(value, true)"
                                    >
                                        {{ formatCurrency(value) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- AI Commentary Panel -->
                <transition
                    enter-active-class="transform transition ease-in-out duration-300"
                    enter-from-class="translate-x-full"
                    enter-to-class="translate-x-0"
                    leave-active-class="transform transition ease-in-out duration-300"
                    leave-from-class="translate-x-0"
                    leave-to-class="translate-x-full"
                >
                    <div v-if="showAIPanel" class="fixed inset-y-0 right-0 z-50 w-96 bg-white shadow-xl">
                        <div class="flex h-full flex-col">
                            <!-- AI Panel Header -->
                            <div class="bg-indigo-600 px-6 py-4">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold text-white">AI Financial Insights</h3>
                                    <button @click="showAIPanel = false" class="text-indigo-200 hover:text-white">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- AI Panel Content -->
                            <div class="flex-1 overflow-y-auto p-6">
                                <div class="space-y-4">
                                    <!-- Quick Insights -->
                                    <div class="rounded-lg bg-gray-50 p-4">
                                        <h4 class="mb-2 font-medium text-gray-900">Quick Insights</h4>
                                        <ul class="space-y-2 text-sm text-gray-600">
                                            <li class="flex items-start">
                                                <svg class="mt-0.5 mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fill-rule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                        clip-rule="evenodd"
                                                    />
                                                </svg>
                                                Strong performance in Q4 with significant sheep sales
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="mt-0.5 mr-2 h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fill-rule="evenodd"
                                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                                        clip-rule="evenodd"
                                                    />
                                                </svg>
                                                Operating expenses remain stable throughout the year
                                            </li>
                                            <li class="flex items-start">
                                                <svg class="mt-0.5 mr-2 h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"
                                                    />
                                                </svg>
                                                Positive net profit trend with seasonal variations
                                            </li>
                                        </ul>
                                    </div>

                                    <!-- Custom Query -->
                                    <div>
                                        <label for="ai-prompt" class="mb-2 block text-sm font-medium text-gray-700"> Ask a specific question: </label>
                                        <textarea
                                            id="ai-prompt"
                                            v-model="aiPrompt"
                                            rows="3"
                                            placeholder="e.g., What are the main drivers of profitability? How can we improve margins?"
                                            class="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                            :disabled="aiLoading"
                                        />
                                    </div>

                                    <button
                                        @click="generateCommentary"
                                        :disabled="!aiPrompt.trim() || aiLoading"
                                        class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {{ aiLoading ? 'Generating...' : 'Generate Insights' }}
                                    </button>

                                    <!-- AI Response -->
                                    <div v-if="aiError" class="rounded-lg border border-red-200 bg-red-50 p-4">
                                        <p class="text-sm text-red-800">{{ aiError }}</p>
                                    </div>

                                    <div v-if="aiResponse" class="rounded-lg border border-gray-200 bg-white p-4">
                                        <h4 class="mb-2 font-medium text-gray-900">AI Analysis:</h4>
                                        <p class="text-sm whitespace-pre-wrap text-gray-700">{{ aiResponse }}</p>
                                    </div>

                                    <!-- Suggested Questions -->
                                    <div class="border-t pt-4">
                                        <h4 class="mb-2 font-medium text-gray-900">Suggested Questions:</h4>
                                        <div class="space-y-2">
                                            <button
                                                @click="aiPrompt = 'What are the key trends in sheep farming income?'"
                                                class="w-full rounded p-2 text-left text-sm text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
                                            >
                                                → What are the key trends in sheep farming income?
                                            </button>
                                            <button
                                                @click="aiPrompt = 'How can we optimize operating expenses?'"
                                                class="w-full rounded p-2 text-left text-sm text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
                                            >
                                                → How can we optimize operating expenses?
                                            </button>
                                            <button
                                                @click="aiPrompt = 'What months show the strongest performance?'"
                                                class="w-full rounded p-2 text-left text-sm text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
                                            >
                                                → What months show the strongest performance?
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Custom scrollbar for the table */
.overflow-x-auto::-webkit-scrollbar {
    height: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #555;
}

/* Print styles */
@media print {
    .no-print {
        display: none;
    }

    table {
        font-size: 10pt;
    }

    .bg-gray-50 {
        background-color: #f9fafb !important;
        -webkit-print-color-adjust: exact;
    }
}
</style>
