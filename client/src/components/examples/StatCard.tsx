import StatCard from '../StatCard';
import { Users, Activity, DollarSign } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StatCard 
        title="Total Members" 
        value="1,234" 
        icon={Users}
        description="+12% from last month"
      />
      <StatCard 
        title="Active Users" 
        value="892" 
        icon={Activity}
        description="72% engagement rate"
      />
      <StatCard 
        title="Revenue" 
        value="$12,450" 
        icon={DollarSign}
        description="+8% from last month"
      />
    </div>
  );
}
