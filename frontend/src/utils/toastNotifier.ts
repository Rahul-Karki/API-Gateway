/**
 * Toast notification service for react-hot-toast
 * Provides a simple interface for showing toast notifications
 */
import toast from "react-hot-toast";

export const showToast = {
  success: (message: string) => {
    toast.success(message);
  },
  error: (message: string) => {
    toast.error(message);
  },
  warning: (message: string) => {
    toast.error(message); // Using error style for warnings
  },
  info: (message: string) => {
    toast(message, {
      icon: "ℹ️",
    });
  },
  loading: (message: string) => {
    return toast.loading(message);
  },
};

export const initializeToast = () => {
  // No initialization needed for react-hot-toast
};
