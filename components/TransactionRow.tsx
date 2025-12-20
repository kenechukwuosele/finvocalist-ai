import React from 'react';
import { Transaction } from '../types';
import { Icons } from '../constants';

interface TransactionRowProps {
  tx: Transaction;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ tx }) => (
  <div className="flex items-center justify-between p-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/30 transition-colors">
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
        {tx.type === 'income' ? <Icons.Plus className="w-5 h-5" /> : <Icons.TrendingUp className="w-5 h-5 rotate-180" />}
      </div>
      <div>
        <p className="font-semibold">{tx.description}</p>
        <p className="text-xs text-slate-500">{tx.category} • {tx.date}</p>
      </div>
    </div>
    <p className={`font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
      {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
    </p>
  </div>
);
