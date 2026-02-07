import React, { useState } from 'react';
import { AuthPage } from './pages/AuthPage.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { TeacherDashboard } from './pages/TeacherDashboard.jsx';
import { StudentDashboard } from './pages/StudentDashboard.jsx';
import { DeveloperDashboard } from './pages/DeveloperDashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <>
      {user.role === 'ADMIN' && <AdminDashboard user={user} onLogout={handleLogout} />}
      {user.role === 'TEACHER' && <TeacherDashboard user={user} onLogout={handleLogout} />}
      {user.role === 'STUDENT' && <StudentDashboard user={user} onLogout={handleLogout} />}
      {user.role === 'DEVELOPER' && <DeveloperDashboard user={user} onLogout={handleLogout} />}
    </>
  );
}