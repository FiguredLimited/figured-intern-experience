export type Report = {
  company: {
    name: string;
    reportType: string;
    basis: string;
    period: string;
    actualsTo: string;
  };
  columns: {
    month: string;
    type: "Actual" | "Total" | string;
  }[];
  sections: Section[];
  summary: {
    name: string;
    values: number[];
  }[];
};

export type Section = {
  id: string;
  name: string;
  level: number;
  collapsible: boolean;
  expanded: boolean;
  subsections?: Section[];
  lineItems?: LineItem[];
  grossProfit?: {
    name: string;
    values: number[];
  };
  total?: {
    name: string;
    values: number[];
  };
};

export type LineItem = {
  name: string;
  accountId: string;
  values: number[];
};