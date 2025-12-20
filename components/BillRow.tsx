import React from 'react';
import { Bill } from '../types';

interface BillRowProps {
  bill: Bill;
  billerName: string;
  onPay?: () => void;
}

export const BillRow: React.FC<BillRowProps> = ({ bill, billerName, onPay }) => (
  <div className="flex items-center justify-between p-4 bg-slate-800/20 rounded-xl border border-slate-700/30">
    <div>
      <p className="font-bold text-slate-200">{billerName}</p>
      <p className="text-xs text-slate-500">Due: {bill.dueDate}</p>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-100">${bill.amount.toFixed(2)}</p>
      {bill.status === 'pending' && onPay && (
        <button onClick={onPay} className="text-[10px] text-emerald-400 font-bold uppercase hover:underline">Pay Now</button>
      )}
      {bill.status === 'paid' && <span className="text-[10px] text-slate-500 font-bold uppercase">Paid</span>}
    </div>
  </div>
);
