import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoleBadge from "./RoleBadge";
import { useState, useEffect } from "react";

interface HeaderProps {
  role: "admin" | "customer";
  userId?: string | null;
  companyId?: string | null;
}

export default function Header({ role, userId, companyId }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const displayId = role === "admin" ? companyId : userId;

  return (
    <header className="border-b bg-card">
      <div className="flex items-center justify-between p-4 lg:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold" data-testid="text-app-title">
            Whop App
          </h2>
          <RoleBadge role={role} />
          {displayId && (
            <span className="text-sm text-muted-foreground font-mono" data-testid="text-user-id">
              {displayId}
            </span>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleDarkMode}
          data-testid="button-theme-toggle"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
