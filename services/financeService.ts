import { FinanceState, Transaction, FinancialInsight } from '../types';

export const getFinanceData = async (): Promise<FinanceState> => {
  const res = await fetch('http://localhost:8000/api/state');
  if (!res.ok) throw new Error('Failed to fetch finance data');
  return res.json();
};

export const getFinancialProfile = async (): Promise<any> => {
    const res = await fetch('http://localhost:8000/api/profile');
    if (!res.ok) throw new Error('Failed to fetch financial profile');
    return res.json();
};

export const createLinkToken = async (): Promise<{ link_token: string }> => {
    const res = await fetch('http://localhost:8000/api/create_link_token', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create link token');
    return res.json();
};

export const setAccessToken = async (public_token: string): Promise<void> => {
     const res = await fetch('http://localhost:8000/api/set_access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token })
    });
    if (!res.ok) throw new Error('Failed to set access token');
};

export const addTransaction = async (tx: Transaction): Promise<{ message: string, new_balance: number }> => {
  // We send the transaction to the backend. 
  // Note: The backend expects the whole Transaction object.
  const res = await fetch('/api/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx)
  });
  if (!res.ok) throw new Error('Failed to add transaction');
  return res.json();
};

export const payBill = async (billId: string): Promise<{ message: string, transaction_id: string }> => {
  const res = await fetch(`/api/bill/pay?bill_id=${billId}`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' }
  });
   if (!res.ok) throw new Error('Failed to pay bill');
   return res.json();
};

export const addInsight = async (insight: FinancialInsight): Promise<void> => {
    await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insight)
    });
};

export const FINANCE_TOOLS = [
  {
    name: 'get_account_balances',
    description: 'Returns current balances for all user accounts.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'add_transaction',
    description: 'Records a new transaction.',
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: { type: 'NUMBER' },
        category: { type: 'STRING' },
        description: { type: 'STRING' },
        type: { type: 'STRING', enum: ['income', 'expense'] },
      },
      required: ['amount', 'category', 'description', 'type'],
    }
  },
  {
    name: 'get_pending_bills',
    description: 'Lists all bills currently marked as pending.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'pay_bill',
    description: 'Initiates a payment for a specific bill. Requires bill ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        billId: { type: 'STRING', description: 'The ID of the bill to pay' },
      },
      required: ['billId'],
    }
  },
  {
    name: 'get_financial_profile',
    description: 'Retrieves a full summary of income, expenses, and budgets for providing personalized advice.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'add_financial_insight',
    description: 'Allows the AI to save a specific financial recommendation or insight for the user to see later in their dashboard.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        content: { type: 'STRING' },
        type: { type: 'STRING', enum: ['saving', 'budgeting', 'investment', 'debt'] },
        impact: { type: 'STRING', enum: ['high', 'medium', 'low'] },
      },
      required: ['title', 'content', 'type', 'impact'],
    }
  },
  {
    name: 'transfer_funds',
    description: 'Transfers money between two accounts.',
    parameters: {
      type: 'OBJECT',
      properties: {
        from_account: { type: 'STRING', description: 'Name or ID of source account (e.g., "checking")' },
        to_account: { type: 'STRING', description: 'Name or ID of destination account (e.g., "savings")' },
        amount: { type: 'NUMBER' },
      },
      required: ['from_account', 'to_account', 'amount'],
    }
  }
];

export const transferFunds = async (from_account: string, to_account: string, amount: number): Promise<{ message: string }> => {
  const res = await fetch('/api/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_account, to_account, amount })
  });
  if (!res.ok) {
     const err = await res.json();
     throw new Error(err.detail || 'Failed to transfer funds');
  }
  return res.json();
};
