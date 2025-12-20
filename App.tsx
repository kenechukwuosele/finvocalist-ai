import React, { useState, useEffect, useCallback } from 'react';
import { FinanceState, Transaction, ChatMessage, FinancialInsight, Bill } from './types';

import { getFinanceData, getFinancialProfile, addTransaction, payBill, addInsight, transferFunds } from './services/financeService';
import { StatCard } from './components/StatCard';
import { TransactionRow } from './components/TransactionRow';
import { InsightCard } from './components/InsightCard';
import { BillRow } from './components/BillRow';
import { useGeminiClient } from './hooks/useGeminiClient';
import { Icons } from './constants';

export default function App() {
  const [finance, setFinance] = useState<FinanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingPayment, setPendingPayment] = useState<{ fcId: string, bill: Bill, billerName: string } | null>(null);

  const refreshFinanceData = useCallback(async () => {
    try {
      const data = await getFinanceData();
      setFinance(data);
    } catch (err) {
      console.error("Failed to fetch finance data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFinanceData();
  }, [refreshFinanceData]);

  const handleToolCall = useCallback(async (fc: any) => {
    console.log("Gemini function call:", fc);
    
    if (!finance) return "Error: Finance data not loaded.";

    if (fc.name === 'get_account_balances') {
      return finance.accounts.map(a => ({ name: a.name, balance: a.balance }));
    } 
    
    if (fc.name === 'add_transaction') {
      const newTx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        amount: fc.args.amount,
        category: fc.args.category,
        description: fc.args.description,
        type: fc.args.type as 'income' | 'expense'
      };
      
      try {
        const res = await addTransaction(newTx);
        await refreshFinanceData();
        return `Success: Added ${newTx.type} of $${newTx.amount}. New Balance: $${res.new_balance}`;
      } catch (e) {
        return "Error adding transaction.";
      }
    } 
    
    if (fc.name === 'get_pending_bills') {
      return finance.bills
        .filter(b => b.status === 'pending')
        .map(b => ({ 
          id: b.id, 
          biller: finance.billers.find(br => br.id === b.billerId)?.name || 'Unknown',
          amount: b.amount,
          dueDate: b.dueDate
        }));
    } 
    
    if (fc.name === 'pay_bill') {
      const bill = finance.bills.find(b => b.id === fc.args.billId);
      const biller = finance.billers.find(br => br.id === bill?.billerId);
      if (bill && biller && bill.status === 'pending') {
        setPendingPayment({ fcId: fc.id, bill, billerName: biller.name });
        return undefined; // Delayed response
      } else {
        return "Bill not found or already paid.";
      }
    } 
    
    if (fc.name === 'get_financial_profile') {
      try {
        const profile = await getFinancialProfile();
        return profile;
      } catch (e) {
        return "Failed to retrieve financial profile.";
      }
    } 
    


    if (fc.name === 'add_financial_insight') {
      const newInsight: FinancialInsight = {
        id: Math.random().toString(36).substr(2, 9),
        title: fc.args.title,
        content: fc.args.content,
        type: fc.args.type,
        impact: fc.args.impact
      };
      await addInsight(newInsight);
      await refreshFinanceData();
      return "Insight saved to user dashboard.";
    }

    if (fc.name === 'transfer_funds') {
      try {
        const res = await transferFunds(fc.args.from_account, fc.args.to_account, fc.args.amount);
        await refreshFinanceData();
        return res.message;
      } catch (e: any) {
        return `Transfer failed: ${e.message}`;
      }
    }

    return "ok";
  }, [finance, refreshFinanceData]);

  const onUserMessage = (text: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'user') return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      return [...prev, { role: 'user', text, timestamp: new Date() }];
    });
  };

  const onAssistantMessage = (text: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      return [...prev, { role: 'assistant', text, timestamp: new Date() }];
    });
  };

  const { isListening, isConnecting, startSession, stopSession, sendToolResponse } = useGeminiClient({
    onFunctionCall: handleToolCall,
    onMessageUser: onUserMessage,
    onMessageAssistant: onAssistantMessage
  });

  const confirmPayment = async () => {
    if (!pendingPayment) return;
    
    const { fcId, bill } = pendingPayment;
    
    try {
        await payBill(bill.id);
        await refreshFinanceData();
        sendToolResponse(fcId, 'pay_bill', "Payment successful. Voice ID verified.");
    } catch (e) {
        sendToolResponse(fcId, 'pay_bill', "Payment failed. Please try again.");
    }
    setPendingPayment(null);
  };

  if (loading || !finance) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Loading Financial Data...</p>
        </div>
      </div>
    );
  }

  const totalBalance = finance.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const monthlySpending = finance.transactions
    .filter(t => t.type === 'expense' && t.date.startsWith('2024-05'))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30">
      <nav className="sticky top-0 z-50 glass border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Icons.Wallet className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FinVocalist <span className="text-emerald-400">AI</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${isListening ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              {isListening ? 'LIVE SESSION' : 'OFFLINE'}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Balance" value={`$${totalBalance.toLocaleString()}`} icon={<Icons.Wallet className="w-6 h-6 text-emerald-400" />} color="bg-emerald-500" />
            <StatCard title="Monthly Spending" value={`$${monthlySpending.toLocaleString()}`} icon={<Icons.TrendingUp className="w-6 h-6 text-blue-400" />} color="bg-blue-500" />
            <StatCard title="Pending Bills" value={finance.bills.filter(b => b.status === 'pending').length.toString()} icon={<Icons.Plus className="w-6 h-6 text-orange-400" />} color="bg-orange-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass rounded-2xl p-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl -mr-16 -mt-16 rounded-full" />
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Icons.Chart className="w-5 h-5 text-emerald-400" /> AI Smart Insights
              </h3>
              <div className="space-y-4">
                {finance.insights.length > 0 ? (
                  finance.insights.map(i => <InsightCard key={i.id} insight={i} />)
                ) : (
                  <p className="text-sm text-slate-500 italic">No insights generated yet. Talk to the advisor to get started.</p>
                )}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Icons.Wallet className="w-5 h-5 text-blue-400" /> Upcoming Bills
              </h3>
              <div className="space-y-3">
                {finance.bills.length > 0 ? (
                  finance.bills.map(b => (
                    <BillRow 
                      key={b.id} 
                      bill={b} 
                      billerName={finance.billers.find(br => br.id === b.billerId)?.name || 'Unknown'} 
                    />
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">All bills paid!</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-lg font-bold">Latest Transactions</h3>
            </div>
            <div className="divide-y divide-slate-700/50">
              {finance.transactions.slice(0, 5).map(tx => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col h-[calc(100vh-120px)] sticky top-24">
          <div className="glass rounded-3xl flex-1 flex flex-col overflow-hidden relative border-2 border-slate-800 shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Icons.Microphone className={`w-5 h-5 ${isListening ? 'text-emerald-400' : 'text-slate-500'}`} />
                  </div>
                  {isListening && <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-pulse-ring" />}
                </div>
                <div>
                  <p className="font-bold">Advisor Mode</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {isListening ? 'Voice ID Verified' : 'Ready for Consultation'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Icons.Microphone className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm">Tap the button to start your secure financial consult</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['"Pay my Verizon bill"', '"How can I save more?"', '"Give me financial advice"'].map(prompt => (
                      <span key={prompt} className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full border border-slate-700">{prompt}</span>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {pendingPayment && (
              <div className="absolute inset-x-0 bottom-[104px] p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Icons.Wallet className="text-emerald-400 w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Confirm Payment?</h4>
                      <p className="text-xs text-slate-400">Voice command received for <strong>{pendingPayment.billerName}</strong></p>
                    </div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total Amount</span>
                    <span className="text-lg font-bold text-emerald-400">${pendingPayment.bill.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPendingPayment(null)} className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-bold hover:bg-slate-700 transition-colors">Cancel</button>
                    <button onClick={confirmPayment} className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-900 text-xs font-bold hover:bg-emerald-400 transition-colors">Confirm & Pay</button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 bg-slate-900/80 border-t border-slate-800">
              <button 
                onClick={isListening ? stopSession : startSession}
                disabled={isConnecting}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform active:scale-95 ${
                  isListening ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : isConnecting ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400'
                }`}
              >
                {isConnecting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isListening ? (
                  <><Icons.Stop className="w-5 h-5 fill-current" /> Finish Consultation</>
                ) : (
                  <><Icons.Microphone className="w-5 h-5 fill-current" /> Secure Voice Consult</>
                )}
              </button>
              <p className="text-center text-[10px] text-slate-600 mt-4 uppercase tracking-widest font-bold">Encrypted Voice ID Session</p>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed -top-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
