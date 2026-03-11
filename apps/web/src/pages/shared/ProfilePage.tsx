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
      showToast('Збережено');
    } catch {}
    setLoading(false);
  };

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Профіль</h1>

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
            <InputField label="Ім'я" value={name} onChange={setName} />
          </div>

          <Button className="w-full mt-4" loading={loading} onClick={handleSave}>
            Зберегти
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}
