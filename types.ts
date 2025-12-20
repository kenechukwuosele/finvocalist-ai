
export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense';
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'checking' | 'savings' | 'investment';
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
}

export interface Biller {
  id: string;
  name: string;
  category: string;
  lastPaymentDate?: string;
  autoPay: boolean;
}

export interface Bill {
  id: string;
  billerId: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
}

export interface FinancialInsight {
  id: string;
  title: string;
  content: string;
  type: 'saving' | 'budgeting' | 'investment' | 'debt';
  impact: 'high' | 'medium' | 'low';
}

export interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  billers: Biller[];
  bills: Bill[];
  insights: FinancialInsight[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}
