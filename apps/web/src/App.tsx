import { Routes, Route, Navigate } from 'react-router-dom';

export function App() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-navy-900">ЮрБот</h1>
            <p className="mt-2 text-slate-600">Юридична платформа</p>
          </div>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
