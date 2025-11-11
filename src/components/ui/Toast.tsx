import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

// Toast component wrapper
export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--toast-bg)',
          color: 'var(--toast-color)',
          border: '1px solid var(--toast-border)',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '400px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
        },
      }}
    />
  );
};

// Toast utility functions
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    });
  },
  
  error: (message: string) => {
    toast.error(message, {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
    });
  },
  
  warning: (message: string) => {
    toast(message, {
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      style: {
        background: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fbbf24',
      },
    });
  },
  
  info: (message: string) => {
    toast(message, {
      icon: <Info className="h-5 w-5 text-blue-500" />,
      style: {
        background: '#dbeafe',
        color: '#1e40af',
        border: '1px solid #60a5fa',
      },
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message);
  },
  
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
};