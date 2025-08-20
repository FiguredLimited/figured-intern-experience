<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { computed, onMounted, ref } from 'vue';

// Reactive data
const reportData = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const selectedMonth = ref<number>(12); // Default to total column

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

// Get simple status for values
const getSimpleStatus = (value: number): { emoji: string; text: string; class: string } => {
    if (value > 50000) return { emoji: '🟢', text: 'Great', class: 'text-green-700 bg-green-50 border-green-200' };
    if (value > 10000) return { emoji: '🟡', text: 'Good', class: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
    if (value > 0) return { emoji: '🟠', text: 'Okay', class: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { emoji: '🔴', text: 'Needs Attention', class: 'text-red-700 bg-red-50 border-red-200' };
};

// Computed simplified metrics
const simplifiedMetrics = computed(() => {
    if (!reportData.value) return null;

    const totalColumn = selectedMonth.value;
    const summary = reportData.value.summary;

    // Find income and expenses
    const incomeSection = reportData.value.sections.find((s: any) => s.id === 'income');
    const expensesSection = reportData.value.sections.find((s: any) => s.id === 'operating_expenses');

    const totalIncome = incomeSection?.total?.values[totalColumn] || 0;
    const totalExpenses = Math.abs(expensesSection?.total?.values[totalColumn] || 0);
    const netProfit = summary[1]?.values[totalColumn] || 0;

    return {
        totalIncome,
        totalExpenses,
        netProfit,
        selectedPeriod: reportData.value.columns[totalColumn]?.month || 'Total',
    };
});

// Calculate simple breakdown
const simpleBreakdown = computed(() => {
    if (!reportData.value || !simplifiedMetrics.value) return [];

    const totalColumn = selectedMonth.value;
    const breakdown = [];

    // Process main sections
    reportData.value.sections.forEach((section: any) => {
        const value = section.total?.values[totalColumn] || 0;
        breakdown.push({
            name: section.name,
            value: value,
            isExpense: section.id === 'operating_expenses',
            children: [],
        });

        // Add major subsections
        if (section.subsections) {
            section.subsections.forEach((subsection: any) => {
                const subValue =
                    subsection.subsections?.reduce((total: number, sub: any) => {
                        return (
                            total +
                            (sub.line_items?.reduce((lineTotal: number, item: any) => {
                                return lineTotal + (item.values[totalColumn] || 0);
                            }, 0) || 0)
                        );
                    }, 0) || 0;

                if (Math.abs(subValue) > 1000) {
                    // Only show significant amounts
                    breakdown[breakdown.length - 1].children.push({
                        name: subsection.name,
                        value: subValue,
                    });
                }
            });
        }
    });

    return breakdown;
});

onMounted(() => {
    fetchFinancialData();
});
</script>

<template>
    <Head title="Easy Mode P&L - Simple Financial Overview" />

    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <!-- Header -->
        <div class="border-b-4 border-blue-500 bg-white shadow-lg">
            <div class="mx-auto max-w-5xl px-6 py-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-6">
                        <Link href="/" class="inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900">
                            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            Back to Home
                        </Link>

                        <div class="text-lg font-semibold text-gray-900">📊 Easy Mode</div>
                    </div>

                    <div class="flex items-center space-x-3">
                        <Link
                            href="/challenge"
                            class="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                            title="Switch to Advanced Mode for detailed analysis"
                        >
                            🔬 Advanced Mode
                        </Link>
                    </div>
                </div>

                <!-- Page Title Section -->
                <div class="mt-6 text-center">
                    <h1 class="text-3xl font-bold text-gray-900">Simple Financial Overview</h1>
                    <p class="mt-2 text-xl text-gray-600">Easy-to-understand profit and loss summary</p>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="mx-auto max-w-5xl px-6 py-8">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-32">
                <div class="text-center">
                    <div class="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-b-4 border-blue-600"></div>
                    <p class="text-xl text-gray-600">Loading your financial data...</p>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="rounded-2xl border-2 border-red-300 bg-red-100 p-12 text-center">
                <div class="mb-6 text-6xl">😟</div>
                <h2 class="mb-4 text-2xl font-bold text-red-800">Oops! Something went wrong</h2>
                <p class="mb-8 text-lg text-red-600">{{ error }}</p>
                <button
                    @click="fetchFinancialData"
                    class="rounded-xl bg-red-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-red-700"
                >
                    🔄 Try Again
                </button>
            </div>

            <!-- Report Content -->
            <div v-else-if="reportData && simplifiedMetrics">
                <!-- Company Info Card -->
                <div class="mb-8 rounded-2xl border-l-8 border-blue-500 bg-white p-8 shadow-xl">
                    <div class="text-center">
                        <h2 class="mb-2 text-4xl font-bold text-gray-900">{{ reportData.company.name }}</h2>
                        <div class="mb-2 text-2xl font-semibold text-blue-600">{{ reportData.company.report_type }}</div>
                        <p class="text-lg text-gray-600">{{ reportData.company.period }}</p>
                    </div>
                </div>

                <!-- Period Selector -->
                <div class="mb-8 rounded-2xl bg-white p-6 shadow-lg">
                    <h3 class="mb-4 text-center text-2xl font-bold text-gray-900">📅 Choose Time Period</h3>
                    <div class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                        <button
                            v-for="(column, index) in reportData.columns"
                            :key="index"
                            @click="selectedMonth = index"
                            class="rounded-xl px-4 py-3 text-center font-semibold transition-all duration-200"
                            :class="
                                selectedMonth === index
                                    ? 'scale-105 transform bg-blue-600 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                            "
                        >
                            <div class="text-lg">{{ column.month }}</div>
                            <div class="text-xs opacity-75">{{ column.type }}</div>
                        </button>
                    </div>
                </div>

                <!-- Key Metrics - Big Numbers -->
                <div class="mb-8 grid gap-8 md:grid-cols-3">
                    <!-- Total Income -->
                    <div class="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-8 text-white shadow-xl">
                        <div class="text-center">
                            <div class="mb-4 text-5xl">💰</div>
                            <h3 class="mb-2 text-2xl font-bold">Money Coming In</h3>
                            <div class="mb-3 text-4xl font-bold">{{ formatCurrency(simplifiedMetrics.totalIncome) }}</div>
                            <div class="flex items-center justify-center">
                                <span class="mr-2 text-lg">{{ getSimpleStatus(simplifiedMetrics.totalIncome).emoji }}</span>
                                <span class="text-lg font-semibold">{{ getSimpleStatus(simplifiedMetrics.totalIncome).text }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Total Expenses -->
                    <div class="rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-8 text-white shadow-xl">
                        <div class="text-center">
                            <div class="mb-4 text-5xl">💸</div>
                            <h3 class="mb-2 text-2xl font-bold">Money Going Out</h3>
                            <div class="mb-3 text-4xl font-bold">{{ formatCurrency(simplifiedMetrics.totalExpenses) }}</div>
                            <div class="text-lg">
                                <span class="font-semibold">
                                    {{
                                        simplifiedMetrics.totalExpenses < simplifiedMetrics.totalIncome * 0.5
                                            ? '👍 Low'
                                            : simplifiedMetrics.totalExpenses < simplifiedMetrics.totalIncome * 0.8
                                              ? '👌 Moderate'
                                              : '⚠️ High'
                                    }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Net Profit -->
                    <div
                        class="rounded-2xl p-8 text-white shadow-xl"
                        :class="
                            simplifiedMetrics.netProfit >= 0
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                                : 'bg-gradient-to-br from-red-500 to-red-600'
                        "
                    >
                        <div class="text-center">
                            <div class="mb-4 text-5xl">{{ simplifiedMetrics.netProfit >= 0 ? '🎯' : '📉' }}</div>
                            <h3 class="mb-2 text-2xl font-bold">What's Left</h3>
                            <div class="mb-3 text-4xl font-bold">{{ formatCurrency(simplifiedMetrics.netProfit) }}</div>
                            <div class="text-lg">
                                <span class="font-semibold">
                                    {{
                                        simplifiedMetrics.netProfit > 50000
                                            ? '🚀 Excellent!'
                                            : simplifiedMetrics.netProfit > 0
                                              ? '✅ Profitable'
                                              : '❌ Loss'
                                    }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Simple Explanation -->
                <div class="mb-8 rounded-2xl bg-white p-8 shadow-lg">
                    <h3 class="mb-6 text-center text-2xl font-bold text-gray-900">🤔 What does this mean?</h3>

                    <div class="grid gap-8 md:grid-cols-2">
                        <div class="text-center">
                            <div class="mb-3 text-3xl">🧮</div>
                            <h4 class="mb-2 text-xl font-semibold text-gray-800">Simple Math</h4>
                            <div class="space-y-2 text-lg text-gray-600">
                                <div>
                                    Money In: <span class="font-bold text-green-600">{{ formatCurrency(simplifiedMetrics.totalIncome) }}</span>
                                </div>
                                <div>
                                    Money Out: <span class="font-bold text-red-600">{{ formatCurrency(simplifiedMetrics.totalExpenses) }}</span>
                                </div>
                                <hr class="my-2" />
                                <div>
                                    What's Left:
                                    <span class="text-2xl font-bold" :class="getValueClass(simplifiedMetrics.netProfit)">{{
                                        formatCurrency(simplifiedMetrics.netProfit)
                                    }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="text-center">
                            <div class="mb-3 text-3xl">💡</div>
                            <h4 class="mb-2 text-xl font-semibold text-gray-800">Quick Tips</h4>
                            <div class="space-y-2 text-left text-gray-600">
                                <div v-if="simplifiedMetrics.netProfit > 0" class="flex items-center">
                                    <span class="mr-2 text-green-500">✅</span>
                                    Your farm is making money this period
                                </div>
                                <div v-else class="flex items-center">
                                    <span class="mr-2 text-red-500">⚠️</span>
                                    Consider reviewing expenses
                                </div>

                                <div class="flex items-center">
                                    <span class="mr-2 text-blue-500">💼</span>
                                    Talk to your accountant for detailed advice
                                </div>

                                <div class="flex items-center">
                                    <span class="mr-2 text-purple-500">📊</span>
                                    Use Advanced Mode for detailed breakdowns
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Simple Breakdown -->
                <div class="rounded-2xl bg-white p-8 shadow-lg">
                    <h3 class="mb-6 text-center text-2xl font-bold text-gray-900">📋 Simple Breakdown</h3>

                    <div class="space-y-6">
                        <div
                            v-for="item in simpleBreakdown"
                            :key="item.name"
                            class="border-l-4 py-4 pl-6"
                            :class="item.isExpense ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'"
                        >
                            <div class="mb-3 flex items-center justify-between">
                                <h4 class="text-xl font-semibold" :class="item.isExpense ? 'text-red-800' : 'text-green-800'">
                                    {{ item.isExpense ? '💸' : '💰' }} {{ item.name }}
                                </h4>
                                <div class="text-2xl font-bold" :class="getValueClass(item.value)">
                                    {{ formatCurrency(Math.abs(item.value)) }}
                                </div>
                            </div>

                            <!-- Sub-items -->
                            <div v-if="item.children.length > 0" class="ml-6 space-y-2">
                                <div v-for="child in item.children" :key="child.name" class="flex items-center justify-between text-lg text-gray-600">
                                    <span>• {{ child.name }}</span>
                                    <span class="font-medium">{{ formatCurrency(Math.abs(child.value)) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Help Section -->
                <div class="mt-8 rounded-2xl border-2 border-blue-200 bg-blue-50 p-8 shadow-lg">
                    <h3 class="mb-4 text-center text-2xl font-bold text-blue-900">🤝 Need Help?</h3>

                    <div class="grid gap-6 text-center md:grid-cols-2">
                        <Link href="/challenge" class="rounded-xl bg-blue-600 p-6 text-white transition-colors hover:bg-blue-700">
                            <div class="mb-2 text-3xl">🔬</div>
                            <div class="text-lg font-semibold">Advanced Mode</div>
                            <div class="mt-1 text-sm opacity-90">Detailed analysis with AI insights</div>
                        </Link>

                        <div class="rounded-xl bg-green-600 p-6 text-white">
                            <div class="mb-2 text-3xl">📞</div>
                            <div class="text-lg font-semibold">Contact Your Accountant</div>
                            <div class="mt-1 text-sm opacity-90">For personalized financial advice</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
button,
.transition-all {
    transition: all 0.2s ease-in-out;
}

button:hover {
    transform: translateY(-1px);
}

.shadow-xl {
    box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
</style>
