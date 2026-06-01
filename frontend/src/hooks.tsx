import { createContext, useContext } from 'react';

export interface AuthContextType {
  user: any;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export interface PopupOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'alert' | 'confirm' | 'disclaimer';
}

export interface PopupContextType {
  showPopup: (options: PopupOptions) => void;
  hidePopup: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
export const PopupContext = createContext<PopupContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) throw new Error('usePopup must be used within PopupProvider');
  return context;
};
