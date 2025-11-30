import AuthGuard from '@/components/AuthGuard';
import ExhibitorManager from '@/components/ExhibitorManager';

export default function AdminPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto p-4 pt-20">
        <h1 className="text-3xl font-bold mb-6">管理者ダッシュボード</h1>
        
        <div className="mb-8">
         <ExhibitorManager />
        </div>
        
      </div>
    </AuthGuard>
  );
}
