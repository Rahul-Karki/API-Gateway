/**
 * Toast notification service for non-React contexts
 * This allows the API client interceptor to show toasts
 */
import { toast as toastify } from "react-toastify";

let toastFunction: typeof toastify | null = null;

export const initializeToast = (toastLib: typeof toastify) => {
  toastFunction = toastLib;
};

export const showToast = {
  success: (message: string) => {
    if (toastFunction) toastFunction.success(message);
  },
  error: (message: string) => {
    if (toastFunction) toastFunction.error(message);
  },
  warning: (message: string) => {
    if (toastFunction) toastFunction.warning(message);
  },
  info: (message: string) => {
    if (toastFunction) toastFunction.info(message);
  },
};
