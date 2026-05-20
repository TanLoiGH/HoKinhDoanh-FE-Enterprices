'use client';

import { useEffect } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'error' | 'warning' | 'success';
  onClose: () => void;
}

export default function Toast({ message, type = 'error', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-in slide-in-from-right duration-300">
      <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[300px]">
        <div className={`p-2 rounded-lg ${type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">{message}</p>
          <p className="text-slate-400 text-sm">Truy cập bị từ chối</p>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="h-1 bg-red-500 absolute bottom-0 left-0 rounded-full animate-shrink" style={{ animationDuration: '4000ms' }}></div>
    </div>
  );
}
