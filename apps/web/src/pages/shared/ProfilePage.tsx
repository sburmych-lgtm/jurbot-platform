import { useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await api.patch(`/v1/users/${user.id}`, { name });
      showToast('\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e');
    } catch {}
    setLoading(false);
  };

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">\u041f\u0440\u043e\u0444\u0456\u043b\u044c</h1>

        <Card>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-accent-teal/15 flex items-center justify-center">
              <User size={28} className="text-accent-teal" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">{user?.name}</p>
              <p className="text-sm text-text-muted">{user?.email}</p>
              <Badge color="teal" className="mt-1">{user?.role}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            <InputField label="\u0406\u043c'\u044f" value={name} onChange={setName} />
          </div>

          <Button className="w-full mt-4" loading={loading} onClick={handleSave}>
            \u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}
