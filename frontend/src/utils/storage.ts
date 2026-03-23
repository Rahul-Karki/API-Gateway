// sessionStorage: cleared when tab closes (more secure)
// localStorage: persists across tabs and browser restarts

export const getAccessToken = (): string | null => {
  return sessionStorage.getItem("accessToken");
};

export const setAccessToken = (token: string): void => {
  sessionStorage.setItem("accessToken", token);
};

export const clearAccessToken = (): void => {
  sessionStorage.removeItem("accessToken");
};