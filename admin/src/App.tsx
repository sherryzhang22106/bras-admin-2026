import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssessmentList from './pages/AssessmentList';
import AssessmentDetail from './pages/AssessmentDetail';
import AccessCodes from './pages/AccessCodes';

function NavLinks() {
  const location = useLocation();
  
  const links = [
    { path: '/', label: '数据概览' },
    { path: '/assessments', label: '测评记录' },
    { path: '/access-codes', label: '兑换码管理' },
  ];

  return (
    <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`${
            location.pathname === link.path
              ? 'border-primary-500 text-gray-900'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-2xl font-bold text-primary-600">BRAS 管理后台</h1>
                </div>
                <NavLinks />
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assessments" element={<AssessmentList />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="/access-codes" element={<AccessCodes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
