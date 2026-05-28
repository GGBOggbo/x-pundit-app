"use client";

import { useState, useEffect, useCallback } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let toastId = 0;
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "error") {
  if (addToastFn) {
    addToastFn(message, type);
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const duration = toast.type === "error" ? 5000 : 3000;
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onRemove]);

  return (
    <div className={`toast toast-${toast.type}`}>
      <span>{toast.message}</span>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        ×
      </button>
    </div>
  );
}
