import React, { useState } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, Upload, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function BackupManager() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Gerando backup, aguarde...');
    
    try {
      const collectionsToBackup = ['bookings', 'barbers', 'services', 'breaks', 'settings', 'clients', 'admins'];
      const backupData: Record<string, any> = {};

      for (const col of collectionsToBackup) {
        const querySnapshot = await getDocs(collection(db, col));
        backupData[col] = {};
        querySnapshot.forEach((document) => {
          backupData[col][document.id] = document.data();
        });
      }

      // Add metadata
      backupData['_metadata'] = {
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_clube_navalha_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Backup gerado com sucesso!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao gerar backup: ' + error.message, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="glass-card p-6 mt-8">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <ShieldCheck className="w-6 h-6 text-gold" />
        <div>
          <h2 className="text-xl font-bold font-display text-white">Backup do Sistema</h2>
          <p className="text-white/50 text-sm mt-1">Gere uma cópia de segurança de todos os dados da barbearia</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-bold text-white mb-2">Exportar Dados (Backup Seguro)</h3>
        <p className="text-white/60 text-sm mb-6">
          Baixe um arquivo contendo todo o histórico de agendamentos, clientes, configurações, barbeiros e serviços. 
          Você pode guardar este arquivo no seu computador ou na nuvem como segurança.
        </p>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {isExporting ? 'Processando Backup...' : 'Fazer Download do Backup (.json)'}
        </button>
      </div>
      
      <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-100/70">
          <p className="font-bold text-blue-400 mb-1">Como restaurar?</p>
          <p>Se você precisar restaurar este backup no futuro, o arquivo JSON gerado contém a estrutura exata do banco de dados para ser reimportado com segurança.</p>
        </div>
      </div>
    </div>
  );
}
