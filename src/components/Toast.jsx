import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type, onClose }) {
  const bgColor = type === 'success' ? 'bg-emerald-600' : 'bg-rose-600';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className={`${bgColor} text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full duration-300 pointer-events-auto border border-white/10`}>
      <Icon size={20} className="shrink-0" />
      <span className="font-bold text-sm tracking-tight">{message}</span>
      <button 
        onClick={onClose}
        className="ml-2 p-1 hover:bg-white dark:bg-slate-800 transition-colors duration-300/20 rounded-lg transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
