import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <div className="glass p-6 rounded-2xl flex items-center gap-4 hover:border-emerald-500/50 transition-colors">
    <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
      {icon}
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  </div>
);
