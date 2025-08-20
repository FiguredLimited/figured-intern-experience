<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { computed, onMounted, onUnmounted, ref } from 'vue';

// Reactive data
const reportData = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const expandedSections = ref<Set<string>>(new Set(['income', 'operating_expenses']));

// AI Commentary state
const aiPrompt = ref('');
const aiResponse = ref('');
const aiLoading = ref(false);
const aiError = ref<string | null>(null);
const showAICommentary = ref(false);

// Export functionality
const showExportMenu = ref(false);
const isExporting = ref(false);

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

        const prompt = `Analyze this farm financial data and provide insights: ${JSON.stringify(reportData.value)}\n\nSpecific question: ${aiPrompt.value}`;

        const response = await fetch('/api/generate-commentary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                prompt: prompt,
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

// Toggle section expansion
const toggleSection = (sectionId: string) => {
    if (expandedSections.value.has(sectionId)) {
        expandedSections.value.delete(sectionId);
    } else {
        expandedSections.value.add(sectionId);
    }
};

// Format currency values
const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    const isNegative = value < 0;
    const formatted = new Intl.NumberFormat('en-NZ', {
        style: 'currency',
        currency: 'NZD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(absValue);

    return isNegative ? `(${formatted})` : formatted;
};

// Get value class for styling
const getValueClass = (value: number): string => {
    if (value < 0) return 'text-red-600';
    if (value > 0) return 'text-green-600';
    return 'text-gray-900';
};

// Calculate percentage change between two values
const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
};

// Format percentage with appropriate styling
const formatPercentage = (percentage: number): string => {
    const abs = Math.abs(percentage);
    if (abs < 0.1) return '0%';
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
};

// Get trend indicator
const getTrendIndicator = (percentage: number): string => {
    if (percentage > 5) return '📈';
    if (percentage < -5) return '📉';
    if (percentage > 0) return '↗️';
    if (percentage < 0) return '↘️';
    return '➡️';
};

// Get trend class for styling
const getTrendClass = (percentage: number): string => {
    if (percentage > 5) return 'text-green-600 font-semibold';
    if (percentage < -5) return 'text-red-600 font-semibold';
    if (percentage > 0) return 'text-green-500';
    if (percentage < 0) return 'text-red-500';
    return 'text-gray-500';
};

// Computed key metrics
const keyMetrics = computed(() => {
    if (!reportData.value) return null;

    const summary = reportData.value.summary;
    const totalColumn = reportData.value.columns.length - 1;

    // Find gross profit from income section
    const incomeSection = reportData.value.sections.find((s: any) => s.id === 'income');
    const grossProfit = incomeSection?.total?.values[totalColumn] || 0;

    const operatingSurplus = summary[0]?.values[totalColumn] || 0;
    const netProfit = summary[1]?.values[totalColumn] || 0;

    return {
        grossProfit,
        operatingSurplus,
        netProfit,
    };
});

// Calculate section total
const calculateSectionTotal = (section: any, columnIndex: number): number => {
    let total = 0;

    const processSubsections = (subsections: any[]) => {
        subsections.forEach((subsection) => {
            if (subsection.line_items) {
                subsection.line_items.forEach((item: any) => {
                    total += item.values[columnIndex] || 0;
                });
            }
            if (subsection.subsections) {
                processSubsections(subsection.subsections);
            }
        });
    };

    if (section.subsections) {
        processSubsections(section.subsections);
    }

    return total;
};

// Export functionality
const exportAsCSV = () => {
    if (!reportData.value) return;

    isExporting.value = true;
    try {
        const csvRows = [];
        const headers = ['Account', ...reportData.value.columns.map((col: any) => col.month)];
        csvRows.push(headers.join(','));

        // Process sections
        reportData.value.sections.forEach((section: any) => {
            csvRows.push(
                `"${section.name}",${section.total ? section.total.values.join(',') : Array(reportData.value.columns.length).fill('').join(',')}`,
            );

            if (section.subsections) {
                section.subsections.forEach((subsection: any) => {
                    const total = reportData.value.columns.map((_: any, idx: number) => calculateSectionTotal(subsection, idx));
                    csvRows.push(`"  ${subsection.name}",${total.join(',')}`);

                    if (subsection.subsections) {
                        subsection.subsections.forEach((subSubsection: any) => {
                            if (subSubsection.line_items) {
                                subSubsection.line_items.forEach((item: any) => {
                                    csvRows.push(`"    ${item.name}",${item.values.join(',')}`);
                                });
                            }
                        });
                    }
                });
            }
        });

        // Add summary
        reportData.value.summary.forEach((summaryItem: any) => {
            csvRows.push(`"${summaryItem.name}",${summaryItem.values.join(',')}`);
        });

        const csvContent = csvRows.join('\n');
        downloadFile(csvContent, 'profit-loss-report.csv', 'text/csv');
    } finally {
        isExporting.value = false;
        showExportMenu.value = false;
    }
};

const exportAsJSON = () => {
    if (!reportData.value) return;

    isExporting.value = true;
    try {
        const jsonContent = JSON.stringify(reportData.value, null, 2);
        downloadFile(jsonContent, 'profit-loss-report.json', 'application/json');
    } finally {
        isExporting.value = false;
        showExportMenu.value = false;
    }
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
    // Alt + E for export menu
    if (event.altKey && event.key === 'e') {
        event.preventDefault();
        showExportMenu.value = !showExportMenu.value;
    }

    // Alt + A for AI commentary
    if (event.altKey && event.key === 'a') {
        event.preventDefault();
        showAICommentary.value = !showAICommentary.value;
    }

    // Alt + C to collapse all sections
    if (event.altKey && event.key === 'c') {
        event.preventDefault();
        expandedSections.value.clear();
    }

    // Alt + X to expand all sections
    if (event.altKey && event.key === 'x') {
        event.preventDefault();
        if (reportData.value) {
            const allSections = new Set<string>();
            reportData.value.sections.forEach((section: any) => {
                allSections.add(section.id);
                if (section.subsections) {
                    section.subsections.forEach((sub: any) => {
                        allSections.add(sub.id);
                        if (sub.subsections) {
                            sub.subsections.forEach((subSub: any) => allSections.add(subSub.id));
                        }
                    });
                }
            });
            expandedSections.value = allSections;
        }
    }

    // Escape to close menus
    if (event.key === 'Escape') {
        showExportMenu.value = false;
        showAICommentary.value = false;
    }
};

onMounted(() => {
    fetchFinancialData();
    document.addEventListener('keydown', handleKeydown);
});

// Cleanup on unmount
onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <Head title="Profit & Loss Report - Figured Challenge" />

    <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="border-b border-gray-200 bg-white shadow-sm">
            <div class="mx-auto max-w-7xl px-4 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-6">
                        <Link href="/" class="inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900">
                            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            Back to Home
                        </Link>

                        <div class="text-lg font-semibold text-gray-900">🔬 Advanced Mode</div>
                    </div>

                    <div class="flex items-center space-x-3">
                        <!-- Mode Switch -->
                        <Link
                            href="/easy-mode"
                            class="flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
                            title="Switch to Easy Mode for simpler overview"
                        >
                            📊 Easy Mode
                        </Link>

                        <!-- Divider -->
                        <div class="h-6 w-px bg-gray-300"></div>

                        <!-- Tools -->
                        <button
                            @click="showAICommentary = !showAICommentary"
                            class="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                            title="AI Insights (Alt+A)"
                        >
                            🤖 AI Insights
                        </button>

                        <!-- Export Menu -->
                        <div class="relative">
                            <button
                                @click="showExportMenu = !showExportMenu"
                                class="flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700"
                                title="Export Report (Alt+E)"
                                :disabled="isExporting"
                            >
                                {{ isExporting ? '⏳' : '📤' }} Export
                            </button>

                            <!-- Export Dropdown -->
                            <div v-if="showExportMenu" class="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                                <div class="py-2">
                                    <button
                                        @click="exportAsCSV"
                                        class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                        :disabled="isExporting"
                                    >
                                        📄 Export as CSV
                                    </button>
                                    <button
                                        @click="exportAsJSON"
                                        class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                        :disabled="isExporting"
                                    >
                                        📋 Export as JSON
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="mx-auto max-w-7xl px-4 py-8">
            <!-- Keyboard Shortcuts Help -->
            <div class="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-800">⌨️ Keyboard Shortcuts</h3>
                    <div class="flex flex-wrap gap-2 text-xs text-gray-600">
                        <span class="rounded bg-white px-2 py-1"><kbd>Alt+A</kbd> AI Insights</span>
                        <span class="rounded bg-white px-2 py-1"><kbd>Alt+E</kbd> Export</span>
                        <span class="rounded bg-white px-2 py-1"><kbd>Alt+X</kbd> Expand All</span>
                        <span class="rounded bg-white px-2 py-1"><kbd>Alt+C</kbd> Collapse All</span>
                        <span class="rounded bg-white px-2 py-1"><kbd>Esc</kbd> Close Menus</span>
                    </div>
                </div>
            </div>
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-20">
                <div class="text-center">
                    <div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                    <span class="text-gray-600">Loading financial data...</span>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                <div class="mb-4 text-6xl text-red-600">⚠️</div>
                <h2 class="mb-2 text-xl font-semibold text-red-800">Error Loading Data</h2>
                <p class="mb-6 text-red-600">{{ error }}</p>
                <button @click="fetchFinancialData" class="rounded-lg bg-red-600 px-6 py-3 text-white transition-colors hover:bg-red-700">
                    Try Again
                </button>
            </div>

            <!-- Financial Report -->
            <div v-else-if="reportData">
                <!-- AI Commentary Panel -->
                <div v-if="showAICommentary" class="mb-8 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                    <div class="mb-4 flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-blue-900">🤖 AI Financial Commentary</h3>
                        <button @click="showAICommentary = false" class="text-blue-600 hover:text-blue-800">✕</button>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <input
                                v-model="aiPrompt"
                                type="text"
                                placeholder="Ask about trends, performance, or get recommendations..."
                                class="w-full rounded-lg border border-blue-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                :disabled="aiLoading"
                                @keyup.enter="generateCommentary"
                            />
                        </div>

                        <button
                            @click="generateCommentary"
                            :disabled="!aiPrompt.trim() || aiLoading"
                            class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {{ aiLoading ? 'Analyzing...' : 'Generate Insights' }}
                        </button>

                        <div v-if="aiError" class="rounded-lg border border-red-200 bg-red-50 p-4">
                            <p class="text-sm text-red-800">{{ aiError }}</p>
                        </div>

                        <div v-if="aiResponse" class="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
                            <h4 class="mb-2 font-medium text-blue-800">💡 AI Insights:</h4>
                            <div class="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{{ aiResponse }}</div>
                        </div>
                    </div>
                </div>

                <!-- Report Header -->
                <div class="mb-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
                    <div class="mb-6 text-center">
                        <h1 class="mb-2 text-3xl font-bold text-gray-900">{{ reportData.company.name }}</h1>
                        <h2 class="mb-1 text-xl text-gray-700">{{ reportData.company.report_type }}</h2>
                        <p class="text-gray-600">{{ reportData.company.period }}</p>
                        <p class="text-sm text-gray-500">{{ reportData.company.basis }}</p>
                    </div>

                    <!-- Key Metrics Dashboard -->
                    <div v-if="keyMetrics" class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div class="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                            <div class="text-center">
                                <div class="mb-2 text-2xl">💰</div>
                                <h3 class="mb-1 font-semibold text-green-800">Gross Profit</h3>
                                <p class="text-2xl font-bold" :class="getValueClass(keyMetrics.grossProfit)">
                                    {{ formatCurrency(keyMetrics.grossProfit) }}
                                </p>
                            </div>
                        </div>

                        <div class="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-6">
                            <div class="text-center">
                                <div class="mb-2 text-2xl">📊</div>
                                <h3 class="mb-1 font-semibold text-blue-800">Operating Surplus</h3>
                                <p class="text-2xl font-bold" :class="getValueClass(keyMetrics.operatingSurplus)">
                                    {{ formatCurrency(keyMetrics.operatingSurplus) }}
                                </p>
                            </div>
                        </div>

                        <div class="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
                            <div class="text-center">
                                <div class="mb-2 text-2xl">🎯</div>
                                <h3 class="mb-1 font-semibold text-purple-800">Net Profit</h3>
                                <p class="text-2xl font-bold" :class="getValueClass(keyMetrics.netProfit)">
                                    {{ formatCurrency(keyMetrics.netProfit) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Financial Report Table -->
                <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <!-- Table Header -->
                            <thead class="border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th class="w-80 px-6 py-4 text-left font-semibold text-gray-900">Account</th>
                                    <th
                                        v-for="(column, index) in reportData.columns"
                                        :key="index"
                                        class="min-w-32 px-3 py-4 text-right font-semibold text-gray-900"
                                        :class="{ 'border-l-2 border-blue-200 bg-blue-50': column.type === 'Total' }"
                                    >
                                        <div class="text-sm">{{ column.month }}</div>
                                        <div class="text-xs tracking-wide text-gray-500 uppercase">{{ column.type }}</div>
                                        <div v-if="index > 0 && index < reportData.columns.length - 1" class="mt-1 text-xs text-gray-400">
                                            vs prev
                                        </div>
                                    </th>
                                </tr>
                            </thead>

                            <tbody class="divide-y divide-gray-100">
                                <!-- Sections -->
                                <template v-for="section in reportData.sections" :key="section.id">
                                    <!-- Section Header -->
                                    <tr class="cursor-pointer bg-gray-800 text-white hover:bg-gray-700" @click="toggleSection(section.id)">
                                        <td class="px-6 py-4 text-lg font-bold">
                                            <div class="flex items-center">
                                                <span class="mr-3">
                                                    {{ expandedSections.has(section.id) ? '▼' : '▶' }}
                                                </span>
                                                {{ section.name }}
                                            </div>
                                        </td>
                                        <td
                                            v-for="(column, columnIndex) in reportData.columns"
                                            :key="columnIndex"
                                            class="px-3 py-4 text-right font-bold"
                                            :class="{ 'border-l-2 border-gray-600 bg-gray-700': column.type === 'Total' }"
                                        >
                                            <div>{{ section.total ? formatCurrency(section.total.values[columnIndex]) : '' }}</div>
                                            <div
                                                v-if="section.total && columnIndex > 0 && columnIndex < reportData.columns.length - 1"
                                                class="mt-1 text-xs text-gray-300"
                                                :class="
                                                    getTrendClass(
                                                        calculatePercentageChange(
                                                            section.total.values[columnIndex],
                                                            section.total.values[columnIndex - 1],
                                                        ),
                                                    )
                                                "
                                            >
                                                {{
                                                    getTrendIndicator(
                                                        calculatePercentageChange(
                                                            section.total.values[columnIndex],
                                                            section.total.values[columnIndex - 1],
                                                        ),
                                                    )
                                                }}
                                                {{
                                                    formatPercentage(
                                                        calculatePercentageChange(
                                                            section.total.values[columnIndex],
                                                            section.total.values[columnIndex - 1],
                                                        ),
                                                    )
                                                }}
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Section Content -->
                                    <template v-if="expandedSections.has(section.id)">
                                        <!-- Subsections -->
                                        <template v-for="subsection in section.subsections" :key="subsection.id">
                                            <!-- Subsection Header -->
                                            <tr class="cursor-pointer bg-blue-50 hover:bg-blue-100" @click="toggleSection(subsection.id)">
                                                <td class="px-6 py-3 font-semibold text-blue-900">
                                                    <div class="ml-6 flex items-center">
                                                        <span class="mr-2 text-sm">
                                                            {{ expandedSections.has(subsection.id) ? '▼' : '▶' }}
                                                        </span>
                                                        {{ subsection.name }}
                                                    </div>
                                                </td>
                                                <td
                                                    v-for="(column, columnIndex) in reportData.columns"
                                                    :key="columnIndex"
                                                    class="px-3 py-3 text-right font-semibold text-blue-900"
                                                    :class="{ 'border-l-2 border-blue-300 bg-blue-100': column.type === 'Total' }"
                                                >
                                                    <div>{{ formatCurrency(calculateSectionTotal(subsection, columnIndex)) }}</div>
                                                    <div
                                                        v-if="columnIndex > 0 && columnIndex < reportData.columns.length - 1"
                                                        class="mt-1 text-xs text-blue-600"
                                                        :class="
                                                            getTrendClass(
                                                                calculatePercentageChange(
                                                                    calculateSectionTotal(subsection, columnIndex),
                                                                    calculateSectionTotal(subsection, columnIndex - 1),
                                                                ),
                                                            )
                                                        "
                                                    >
                                                        {{
                                                            getTrendIndicator(
                                                                calculatePercentageChange(
                                                                    calculateSectionTotal(subsection, columnIndex),
                                                                    calculateSectionTotal(subsection, columnIndex - 1),
                                                                ),
                                                            )
                                                        }}
                                                        {{
                                                            formatPercentage(
                                                                calculatePercentageChange(
                                                                    calculateSectionTotal(subsection, columnIndex),
                                                                    calculateSectionTotal(subsection, columnIndex - 1),
                                                                ),
                                                            )
                                                        }}
                                                    </div>
                                                </td>
                                            </tr>

                                            <!-- Subsection Content -->
                                            <template v-if="expandedSections.has(subsection.id)">
                                                <!-- Sub-subsections -->
                                                <template v-for="subSubsection in subsection.subsections" :key="subSubsection.id">
                                                    <!-- Sub-subsection Header -->
                                                    <tr
                                                        class="bg-indigo-25 cursor-pointer hover:bg-indigo-50"
                                                        @click="toggleSection(subSubsection.id)"
                                                    >
                                                        <td class="px-6 py-2 font-medium text-indigo-800">
                                                            <div class="ml-12 flex items-center">
                                                                <span class="mr-2 text-sm">
                                                                    {{ expandedSections.has(subSubsection.id) ? '▼' : '▶' }}
                                                                </span>
                                                                {{ subSubsection.name }}
                                                            </div>
                                                        </td>
                                                        <td
                                                            v-for="(column, columnIndex) in reportData.columns"
                                                            :key="columnIndex"
                                                            class="px-4 py-2 text-right font-medium text-indigo-800"
                                                            :class="{ 'border-l-2 border-indigo-200 bg-indigo-50': column.type === 'Total' }"
                                                        ></td>
                                                    </tr>

                                                    <!-- Line Items -->
                                                    <template v-if="expandedSections.has(subSubsection.id)">
                                                        <tr
                                                            v-for="lineItem in subSubsection.line_items"
                                                            :key="lineItem.account_id"
                                                            class="hover:bg-gray-50"
                                                        >
                                                            <td class="ml-16 px-6 py-2 text-gray-700">
                                                                <div class="ml-16">{{ lineItem.name }}</div>
                                                            </td>
                                                            <td
                                                                v-for="(value, valueIndex) in lineItem.values"
                                                                :key="valueIndex"
                                                                class="px-3 py-2 text-right"
                                                                :class="[
                                                                    getValueClass(value),
                                                                    {
                                                                        'border-l-2 border-gray-200 bg-gray-50':
                                                                            reportData.columns[valueIndex].type === 'Total',
                                                                    },
                                                                ]"
                                                            >
                                                                <div>{{ formatCurrency(value) }}</div>
                                                                <div
                                                                    v-if="
                                                                        valueIndex > 0 &&
                                                                        valueIndex < lineItem.values.length - 1 &&
                                                                        (value !== 0 || lineItem.values[valueIndex - 1] !== 0)
                                                                    "
                                                                    class="mt-1 text-xs"
                                                                    :class="
                                                                        getTrendClass(
                                                                            calculatePercentageChange(value, lineItem.values[valueIndex - 1]),
                                                                        )
                                                                    "
                                                                >
                                                                    {{
                                                                        getTrendIndicator(
                                                                            calculatePercentageChange(value, lineItem.values[valueIndex - 1]),
                                                                        )
                                                                    }}
                                                                    {{
                                                                        formatPercentage(
                                                                            calculatePercentageChange(value, lineItem.values[valueIndex - 1]),
                                                                        )
                                                                    }}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </template>
                                                </template>
                                            </template>
                                        </template>
                                    </template>
                                </template>

                                <!-- Summary Section -->
                                <template v-for="summaryItem in reportData.summary" :key="summaryItem.name">
                                    <tr class="border-t-2 border-yellow-200 bg-yellow-50 font-bold">
                                        <td class="px-6 py-4 text-lg font-bold text-yellow-900">{{ summaryItem.name }}</td>
                                        <td
                                            v-for="(value, valueIndex) in summaryItem.values"
                                            :key="valueIndex"
                                            class="px-3 py-4 text-right text-lg font-bold"
                                            :class="[
                                                getValueClass(value),
                                                { 'border-l-2 border-yellow-300 bg-yellow-100': reportData.columns[valueIndex].type === 'Total' },
                                            ]"
                                        >
                                            <div>{{ formatCurrency(value) }}</div>
                                            <div
                                                v-if="valueIndex > 0 && valueIndex < summaryItem.values.length - 1"
                                                class="mt-1 text-sm text-yellow-700"
                                                :class="getTrendClass(calculatePercentageChange(value, summaryItem.values[valueIndex - 1]))"
                                            >
                                                {{ getTrendIndicator(calculatePercentageChange(value, summaryItem.values[valueIndex - 1])) }}
                                                {{ formatPercentage(calculatePercentageChange(value, summaryItem.values[valueIndex - 1])) }}
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Report Footer -->
                <div class="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div class="text-center text-sm text-gray-500">
                        <p class="mb-2">
                            Report generated on
                            {{
                                new Date().toLocaleDateString('en-NZ', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })
                            }}
                        </p>
                        <p>{{ reportData.company.basis }} • Actuals to {{ reportData.company.actuals_to }}</p>

                        <div class="mt-4 flex justify-center space-x-6 text-xs">
                            <div class="flex items-center">
                                <div class="mr-2 h-3 w-3 rounded bg-green-500"></div>
                                <span>Positive Values</span>
                            </div>
                            <div class="flex items-center">
                                <div class="mr-2 h-3 w-3 rounded bg-red-500"></div>
                                <span>Negative Values (Loss)</span>
                            </div>
                            <div class="flex items-center">
                                <div class="mr-2 h-3 w-3 rounded bg-blue-500"></div>
                                <span>Total Column</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Custom styles for better visual hierarchy */
.bg-indigo-25 {
    background-color: rgb(248 250 252);
}
</style>
