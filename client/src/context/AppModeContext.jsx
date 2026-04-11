import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AppModeContext = createContext(null);

function moduleFromPath(pathname) {
  if (pathname.startsWith("/stayora")) return "stayora";
  if (pathname.startsWith("/tripora")) return "tripora";
  return null;
}

export function AppModeProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [module, setModule] = useState(() => moduleFromPath(location.pathname) || "tripora");

  useEffect(() => {
    const fromPath = moduleFromPath(location.pathname);
    if (fromPath) setModule(fromPath);
  }, [location.pathname]);

  const setMode = (next) => {
    const m = next === "stayora" ? "stayora" : "tripora";
    setModule(m);
    navigate(m === "stayora" ? "/stayora" : "/tripora");
  };

  const value = useMemo(
    () => ({
      mode: module,
      setMode,
      isTripora: module === "tripora",
      isStayora: module === "stayora",
    }),
    [module]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within AppModeProvider");
  return ctx;
}
