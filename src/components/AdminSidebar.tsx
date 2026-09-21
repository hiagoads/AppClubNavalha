import React from 'react';
import { Users, BarChart3, Settings, Scissors, History, LogOut, Menu, X, Award, Gamepad2 } from 'lucide-react';
import { auth } from '../lib/firebase';

interface AdminSidebarProps {
  activeTab: 'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log' | 'gamification' | 'vip_room';
  setActiveTab: (tab: 'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log' | 'gamification' | 'vip_room') => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
        active 
          ? 'bg-gold text-carbon font-bold shadow-lg shadow-gold/20' 
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function AdminSidebar({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }: AdminSidebarProps) {
  return (
    <aside className={`${
      isMobileMenuOpen ? 'flex' : 'hidden'
    } w-full md:w-64 bg-carbon-light/95 backdrop-blur-md border-r border-white/10 p-4 sm:p-6 flex-col shrink-0 overflow-y-auto fixed h-[calc(100dvh-80px)] z-30 top-[80px] pb-12`}>
      <nav className="flex-1 space-y-2 mt-4">
        <button onClick={() => { setActiveTab('queue'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<Users />} label="Fila" active={activeTab === 'queue'} />
        </button>
        <button onClick={() => { setActiveTab('gamification'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<Award />} label="Clube Navalha" active={activeTab === 'gamification'} />
        </button>
        <button onClick={() => { setActiveTab('vip_room'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<Gamepad2 />} label="Sala VIP" active={activeTab === 'vip_room'} />
        </button>
        <button onClick={() => { setActiveTab('log'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<History />} label="Controle de Tabela" active={activeTab === 'log'} />
        </button>
        <button onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<BarChart3 />} label="Faturamento" active={activeTab === 'billing'} />
        </button>
        <button onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<History />} label="Histórico (Restaurar)" active={activeTab === 'history'} />
        </button>
        <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<Settings />} label="Configurações" active={activeTab === 'settings'} />
        </button>
        <button onClick={() => { setActiveTab('barbers'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<Scissors />} label="Barbeiros" active={activeTab === 'barbers'} />
        </button>
        <button onClick={() => { setActiveTab('services'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
          <NavItem icon={<Settings />} label="Serviços" active={activeTab === 'services'} />
        </button>
      </nav>

      <button 
        onClick={() => auth.signOut()}
        className="mt-6 md:mt-auto flex items-center gap-3 p-3 text-white/40 hover:text-red-400 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>Sair</span>
      </button>
    </aside>
  );
}
