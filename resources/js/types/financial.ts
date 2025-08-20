export interface Company {
    name: string;
    report_type: string;
    basis: string;
    period: string;
    actuals_to: string;
  }
  
  export interface Column {
    month: string;
    type: 'Actual' | 'Forecast' | 'Total';
  }
  
  export interface LineItem {
    name: string;
    account_id: string;
    values: number[];
  }
  
  export interface SubSection {
    id: string;
    name: string;
    level: number;
    collapsible: boolean;
    expanded: boolean;
    line_items?: LineItem[];
    subsections?: SubSection[];
    gross_profit?: {
      name: string;
      values: number[];
    };
  }
  
  export interface Section {
    id: string;
    name: string;
    level: number;
    collapsible: boolean;
    expanded: boolean;
    subsections: SubSection[];
    total?: {
      name: string;
      values: number[];
    };
  }
  
  export interface SummaryItem {
    name: string;
    values: number[];
  }
  
  export interface FinancialReport {
    company: Company;
    columns: Column[];
    sections: Section[];
    summary: SummaryItem[];
  }