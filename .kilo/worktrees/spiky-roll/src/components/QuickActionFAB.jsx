import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText } from 'lucide-react';

export default function QuickActionFAB() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative flex flex-col items-center">
      {/* Main Center Button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/new-bill'); }}
        className={`flex flex-col items-center justify-center -mt-8 mb-1 text-white w-16 h-16 rounded-[20px] shadow-[0_8px_20px_rgba(99,102,241,0.4)] border-4 border-[#f5f7fb] relative z-[60] bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-[1.05] active:scale-[0.95] transition-all duration-200`}
      >
        <FileText size={26} strokeWidth={2.5} />
      </button>
      
      {/* Label Text */}
      <span className={`text-[10px] font-bold tracking-tight ${location.pathname === '/new-bill' ? 'text-purple-600 font-black' : 'text-slate-500'}`}>
         New Bill
      </span>
    </div>
  );
}
