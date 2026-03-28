import { Header } from '@/components/Header';
import { ConfigPanel } from '@/components/ConfigPanel';
import { CallPanel } from '@/components/CallPanel';
import { SupportPopup } from '@/components/SupportPopup';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[400px_1fr] xl:grid-cols-[450px_1fr] h-full lg:h-[calc(100vh-120px)] gap-6">
          
          {/* Coluna Esquerda: Configurações */}
          <section className="h-full flex flex-col shrink-0">
            <ConfigPanel />
          </section>

          {/* Coluna Direita: Área de Execução e Chamada */}
          <section className="h-full flex flex-col min-h-[600px]">
            <CallPanel />
          </section>

        </div>
      </main>

      <SupportPopup />
    </div>
  );
}
