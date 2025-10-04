import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative transition-colors duration-200 hover:bg-accent"
    >
      {/* Simplified icons with faster transitions */}
      <Sun 
        className={`h-5 w-5 transition-opacity duration-200 text-amber-500 ${
          theme === 'light' ? 'opacity-100' : 'opacity-0'
        } absolute`}
      />
      
      <Moon 
        className={`h-5 w-5 transition-opacity duration-200 text-slate-700 dark:text-slate-300 ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        } absolute`}
      />
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}