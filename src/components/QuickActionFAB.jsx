import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, FileText, Package, Users } from 'lucide-react';

export default function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className="relative flex flex-col items-center">
      {/* Backdrop for closing */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[55]" 
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        />
      )}

      {/* Action Menu Container */}
      <div className="absolute bottom-[4.5rem] z-[60] flex flex-col items-end gap-3 left-1/2 -translate-x-1/2 w-max">
        {isOpen && actions.map((action, idx) => (
          <div 
            key={idx} 
            className="flex items-center justify-end gap-3 group cursor-pointer animate-in slide-in-from-bottom-2 duration-200"
            onClick={(e) => { e.stopPropagation(); handleAction(action.path); }}
          >
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-slate-700 font-bold text-sm">
              {action.label}
            </span>
            <button className={`${action.color} text-white p-3.5 rounded-2xl shadow-lg hover:scale-110 transition-all border-2 border-white/20`}>
              <action.icon size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Main Center Button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex flex-col items-center justify-center -mt-8 mb-1 text-white w-14 h-14 rounded-2xl shadow-xl border-4 border-slate-50 relative z-[60] transition-all duration-300 ${
          isOpen ? 'bg-slate-800 rotate-45 scale-90' : 'bg-indigo-600 hover:scale-110 active:scale-95 shadow-indigo-600/40'
        }`}
      >
        <Plus size={24} strokeWidth={3} />
      </button>
      
      {/* Label Text */}
      <span className={`text-[9px] font-black uppercase tracking-tighter ${location.pathname === '/new-bill' && !isOpen ? 'text-indigo-600' : 'text-slate-400'}`}>
         New Bill
      </span>
    </div>
  );
}
