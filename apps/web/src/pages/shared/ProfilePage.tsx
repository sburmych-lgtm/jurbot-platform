import { useState } from 'react';
import { User, Mail, Phone, MapPin, Save } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { InputField } from '@/components/ui/InputField';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.patch(`/v1/users/${user.id}`, { name, phone, city });
      showToast('Профіль збережено');
    } catch {
      showToast('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">Профіль</h1>

        <Card>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-navy-100 rounded-full flex items-center justify-center text-navy-600 font-bold text-xl">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-navy-800">{user.name}</p>
              <Badge color={user.role === 'LAWYER' ? 'purple' : 'blue'}>
                {user.role === 'LAWYER' ? 'Юрист' : 'Клієнт'}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <InputField icon={User} label="ПІБ" value={name} onChange={setName} placeholder="Ваше ім'я" />
            <InputField icon={Mail} label="Email" value={user.email} disabled placeholder="" onChange={() => {}} />
            <InputField icon={Phone} label="Телефон" value={phone} onChange={setPhone} placeholder="+380..." />
            <InputField icon={MapPin} label="Місто" value={city} onChange={setCity} placeholder="Ваше місто" />
          </div>

          <Button onClick={handleSave} loading={saving} className="w-full mt-4" size="lg">
            <Save size={16} /> Зберегти
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}
