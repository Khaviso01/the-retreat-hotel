import { createContext, useContext, useState, type ReactNode } from 'react';
import { send, type User } from '../lib/api';

/**
 * Global application context interface defining authentication actions,
 * user session states, toast notification triggers, and confirmation modals.
 */
type Ctx = {
  user: User | null;
  setUser: (u: User | null) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  googleLogin: (code: string) => Promise<User>;
  logout: () => void;
  toast: (message: string) => void;
  confirm: (message: string, action: () => void | Promise<void>) => void;
};

const Context = createContext<Ctx | null>(null);

/**
 * Application context provider wrapping the component tree to manage auth tokens,
 * persistent session state, and global notification/dialog overlays.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('retreat_user') || 'null');
    } catch {
      return null;
    }
  });

  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<{
    message: string;
    action: () => void | Promise<void>;
  } | null>(null);

  const persist = (u: User, token: string) => {
    localStorage.setItem('retreat_token', token);
    localStorage.setItem('retreat_user', JSON.stringify(u));
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const data = await send<{ user: User; token: string }>('/auth/login', 'POST', {
      email,
      password,
    });
    persist(data.user, data.token);
    return data.user;
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await send<{ user: User; token: string }>('/auth/register', 'POST', {
      name,
      email,
      password,
    });
    persist(data.user, data.token);
    return data.user;
  };

  // Exchange Google's temporary login code for our application session.
  const googleLogin = async (code: string): Promise<User> => {
    const data = await send<{ user: User; token: string }>(
      '/auth/google/exchange',
      'POST',
      { code }
    );

    persist(data.user, data.token);

    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('retreat_token');
    localStorage.removeItem('retreat_user');
    setUser(null);
  };

  const toast = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4200);
  };

  const confirm = (message: string, action: () => void | Promise<void>) =>
    setDialog({ message, action });

  return (
    <Context.Provider
      value={{
        user,
        setUser,
        login,
        register,
        googleLogin,
        logout,
        toast,
        confirm
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          ✓ {notice}
          <button onClick={() => setNotice('')}>×</button>
        </div>
      )}
      {dialog && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="dialog">
            <div className="dialog-icon">!</div>
            <h2>Confirm action</h2>
            <p>{dialog.message}</p>
            <div className="actions">
              <button className="btn outline" onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={async () => {
                  const action = dialog.action;
                  setDialog(null);
                  try {
                    await action();
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}

/**
 * Custom hook to access global application context.
 * Throws an error if used outside an AppProvider.
 */
export const useApp = () => {
  const value = useContext(Context);
  if (!value) throw Error('Missing AppProvider');
  return value;
};