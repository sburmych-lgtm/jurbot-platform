import { Bell, LogOut, Scale } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const basePath = user?.role === 'LAWYER' ? '/lawyer' : '/client';

  return (
    <div className="bg-navy-900 text-white px-4 py-3 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-gold-400" />
          <div>
            <h1 className="text-lg font-bold">ЮрБот</h1>
            {user && <p className="text-navy-300 text-xs">{user.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`${basePath}/notifications`)}
            className="relative p-2 rounded-lg hover:bg-navy-800 transition"
          >
            <Bell size={20} className="text-navy-300" />
          </button>
          <button
            onClick={handleLogout}
            className="text-navy-400 hover:text-white transition p-2 rounded-lg hover:bg-navy-800"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
