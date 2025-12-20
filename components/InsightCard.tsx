import React from 'react';
import { FinancialInsight } from '../types';
import { Icons } from '../constants';

interface InsightCardProps {
  insight: FinancialInsight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const impactColor = insight.impact === 'high' ? 'text-red-400 bg-red-400/10' : insight.impact === 'medium' ? 'text-yellow-400 bg-yellow-400/10' : 'text-blue-400 bg-blue-400/10';
  return (
    <div className="glass p-5 rounded-2xl border-l-4 border-emerald-500 hover:translate-x-1 transition-transform cursor-default">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-slate-100">{insight.title}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${impactColor}`}>
          {insight.impact} impact
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{insight.content}</p>
    </div>
  );
};
