import React, { createContext, useContext, useState, useCallback } from 'react';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const icons = { success: <FaCheckCircle />, error: <FaTimesCircle />, info: <FaInfoCircle /> };

    return (
        <ToastContext.Provider value={{ success: m => addToast(m, 'success'), error: m => addToast(m, 'error'), info: m => addToast(m, 'info') }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        {icons[t.type]}
                        <span>{t.message}</span>
                        <button className="toast-close" onClick={() => removeToast(t.id)}><FaTimes /></button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
