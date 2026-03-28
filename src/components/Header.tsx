import { History, Settings, PhoneForwarded } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-between p-4 px-6 border-b border-border/50 bg-background">
      <div className="flex items-center gap-2">
        <div className="bg-primary/20 p-2 rounded-lg">
          <PhoneForwarded className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-foreground">SIMULADOR B2B</h1>
      </div>
      
      <div className="flex items-center gap-6 text-sm text-foreground/80">
        <button className="flex items-center gap-2 hover:text-foreground transition-colors group">
          <History className="w-5 h-5 group-hover:-rotate-45 transition-transform" />
          <span>Histórico</span>
        </button>
        <button className="hover:text-foreground transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
