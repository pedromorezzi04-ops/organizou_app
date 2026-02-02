import React, { createContext, useContext } from "react";
import { useBlockedCheck } from "@/hooks/useBlockedCheck";

type UserStatusContextType = ReturnType<typeof useBlockedCheck>;

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

export const UserStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useBlockedCheck();
  return <UserStatusContext.Provider value={value}>{children}</UserStatusContext.Provider>;
};

export const useUserStatus = () => {
  const ctx = useContext(UserStatusContext);
  if (!ctx) throw new Error("useUserStatus must be used within UserStatusProvider");
  return ctx;
};
