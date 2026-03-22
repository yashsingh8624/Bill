import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Package, Users, X } from 'lucide-react';

export default function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { label: 'New Bill', icon: FileText, path: '/new-bill', color: 'bg-emerald-600' },
    { label: 'Add Product', icon: Package, path: '/products', color: 'bg-blue-600' },
    { label: 'Add Customer', icon: Users, path: '/customers', color: 'bg-amber-600' },
  ];

  const handleAction = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3 lg:bottom-10 lg:right-10">
      {/* Action Menu */}
      {isOpen && (
        <div className="flex flex-col items-end gap-3 mb-2 animate-in slide-in-from-bottom-4 duration-200">
          {actions.map((action, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-3 group cursor-pointer"
              onClick={() => handleAction(action.path)}
            >
              <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-slate-700 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                {action.label}
              </span>
              <button className={`${action.color} text-white p-3.5 rounded-2xl shadow-lg hover:scale-110 transition-all border-2 border-white/20`}>
                <action.icon size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-3xl shadow-2xl transition-all duration-300 flex items-center justify-center border-4 border-white/50 backdrop-blur-sm ${
          isOpen ? 'bg-slate-800 rotate-45 scale-90' : 'bg-indigo-600 hover:scale-110 active:scale-95 shadow-indigo-600/40'
        }`}
      >
        <Plus size={32} className="text-white" />
      </button>

      {/* Backdrop for closing */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-[-1]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
