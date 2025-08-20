<script setup lang="ts">
import { computed, ref } from 'vue';

// Props
interface Props {
    section: any;
    columns: Array<{ month: string; type: string }>;
    level?: number;
}

const props = withDefaults(defineProps<Props>(), {
    level: 1,
});

// State
const isExpanded = ref(props.section.expanded || false);

// Computed
const indentClass = computed(() => {
    const indentMap = {
        1: 'pl-6',
        2: 'pl-12',
        3: 'pl-20',
        4: 'pl-28',
    };
    return indentMap[props.level as keyof typeof indentMap] || 'pl-6';
});

const bgClass = computed(() => {
    if (props.level === 1) return 'bg-gray-50 font-semibold text-gray-900';
    if (props.level === 2) return 'bg-gray-100 font-medium text-gray-800';
    return 'bg-white text-gray-700';
});

// Methods
const toggleExpanded = () => {
    if (props.section.collapsible) {
        isExpanded.value = !isExpanded.value;
    }
};

const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    if (value < 0) {
        return `($${absValue.toLocaleString()})`;
    }
    return `$${absValue.toLocaleString()}`;
};

const getValueClass = (value: number, isExpense: boolean = false) => {
    if (value === 0) return 'text-gray-400';

    // For expenses, positive values are bad (red), negative values are good (green)
    // For income, positive values are good (green), negative values are bad (red)
    if (isExpense) {
        return value > 0 ? 'text-red-600' : 'text-green-600';
    } else {
        return value >= 0 ? 'text-green-600' : 'text-red-600';
    }
};

const isExpenseSection = computed(() => {
    return (
        props.section.id?.includes('cost') ||
        props.section.id?.includes('expense') ||
        props.section.name?.toLowerCase().includes('cost') ||
        props.section.name?.toLowerCase().includes('expense')
    );
});
</script>

<template>
    <!-- Section Header -->
    <tr
        v-if="section.name"
        :class="bgClass"
        class="cursor-pointer border-b border-gray-200 transition-colors hover:bg-gray-100"
        @click="toggleExpanded"
    >
        <td class="py-3 text-sm" :class="indentClass">
            <div class="flex items-center">
                <span v-if="section.collapsible" class="mr-2 text-gray-400 transition-transform duration-200" :class="{ 'rotate-90': isExpanded }">
                    ▶
                </span>
                <span class="tracking-wider uppercase">{{ section.name }}</span>
            </div>
        </td>
        <td
            v-for="(value, index) in section.total?.values || []"
            :key="index"
            class="px-3 py-3 text-right text-sm font-medium"
            :class="getValueClass(value, isExpenseSection)"
        >
            <span v-if="value !== undefined">{{ formatCurrency(value) }}</span>
        </td>
    </tr>

    <!-- Section Content -->
    <template v-if="isExpanded || !section.collapsible">
        <!-- Subsections -->
        <template v-if="section.subsections">
            <FinancialSection
                v-for="subsection in section.subsections"
                :key="subsection.id || subsection.name"
                :section="subsection"
                :columns="columns"
                :level="level + 1"
            />
        </template>

        <!-- Line Items -->
        <template v-if="section.line_items">
            <tr v-for="lineItem in section.line_items" :key="lineItem.name" class="border-b border-gray-100 transition-colors hover:bg-gray-50">
                <td class="py-2 text-sm text-gray-700" :class="level === 1 ? 'pl-10' : level === 2 ? 'pl-16' : level === 3 ? 'pl-24' : 'pl-32'">
                    {{ lineItem.name }}
                </td>
                <td
                    v-for="(value, index) in lineItem.values"
                    :key="index"
                    class="px-3 py-2 text-right text-sm"
                    :class="getValueClass(value, isExpenseSection)"
                >
                    <span v-if="value !== 0">{{ formatCurrency(value) }}</span>
                    <span v-else class="text-gray-300">—</span>
                </td>
            </tr>
        </template>

        <!-- Gross Profit Row -->
        <tr v-if="section.gross_profit" class="border-b border-green-200 bg-green-50 font-medium">
            <td class="py-2 text-sm text-green-800" :class="level === 1 ? 'pl-10' : level === 2 ? 'pl-16' : level === 3 ? 'pl-24' : 'pl-32'">
                {{ section.gross_profit.name }}
            </td>
            <td v-for="(value, index) in section.gross_profit.values" :key="index" class="px-3 py-2 text-right text-sm font-semibold text-green-700">
                {{ formatCurrency(value) }}
            </td>
        </tr>
    </template>
</template>
