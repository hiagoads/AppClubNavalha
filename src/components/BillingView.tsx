import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookingStatus } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DollarSign, TrendingUp, Scissors, Calendar } from 'lucide-react';

export default function BillingView() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCuts: 0,
    topService: 'N/A',
    dailyData: [] as any[]
  });

  useEffect(() => {
    const fetchData = async () => {
      // For demo, we fetch completed bookings
      const q = query(collection(db, 'bookings'), where('status', '==', BookingStatus.COMPLETED));
      const snap = await getDocs(q);
      
      let revenue = 0;
      let cuts = 0;
      const serviceCounts: Record<string, number> = {};

      snap.docs.forEach(doc => {
        const data = doc.data();
        revenue += data.price || 50; // Use actual price if stored, else fallback
        cuts++;
        serviceCounts[data.serviceId] = (serviceCounts[data.serviceId] || 0) + 1;
      });

      // Group by day for chart (simplified)
      const chartData = [
        { name: 'Seg', total: 400 },
        { name: 'Ter', total: 300 },
        { name: 'Qua', total: 550 },
        { name: 'Qui', total: 420 },
        { name: 'Sex', total: 700 },
        { name: 'Sáb', total: 1000 },
        { name: 'Dom', total: 200 }
      ];

      setStats({
        totalRevenue: revenue,
        totalCuts: cuts,
        topService: Object.keys(serviceCounts).sort((a,b) => serviceCounts[b] - serviceCounts[a])[0] || 'Corte Padrão',
        dailyData: chartData
      });
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Faturamento Total" value={`R$ ${stats.totalRevenue}`} icon={<DollarSign className="text-green-500" />} />
        <StatCard title="Cortes Realizados" value={stats.totalCuts} icon={<Scissors className="text-gold" />} />
        <StatCard title="Serviço Mais Pedido" value={stats.topService} icon={<TrendingUp className="text-blue-500" />} />
      </div>

      <div className="glass-card p-6 min-h-[400px]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-display font-bold">Desempenho da Semana</h3>
          <div className="flex bg-white/5 p-1 rounded-lg">
            <button className="px-3 py-1 text-xs font-bold bg-gold text-carbon rounded">Semana</button>
            <button className="px-3 py-1 text-xs font-bold text-white/40">Mês</button>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#1E1E1E', border: 'none', borderRadius: '8px' }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {stats.dailyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 5 ? '#D4AF37' : '#FFFFFF20'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="glass-card p-6 flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{title}</p>
        <p className="text-2xl font-display font-bold">{value}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-xl">
        {icon}
      </div>
    </div>
  );
}
