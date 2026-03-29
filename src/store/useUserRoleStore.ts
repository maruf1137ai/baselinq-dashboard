import { create } from 'zustand';

interface UserRoleState {
  userRole: string;
  setUserRole: (role: string) => void;
  clearUserRole: () => void;
}

export const useUserRoleStore = create<UserRoleState>((set) => ({
  userRole: localStorage.getItem('userRole') || '',
  setUserRole: (role: string) => {
    localStorage.setItem('userRole', role);
    set({ userRole: role });
  },
  clearUserRole: () => {
    localStorage.removeItem('userRole');
    set({ userRole: '' });
  },
}));
