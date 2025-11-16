
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ConfigurePage from './pages/ConfigurePage';
import StremioHandler from './pages/StremioHandler';
import LogsPage from './pages/LogsPage';
import { DocumentTextIcon } from './components/icons/DocumentTextIcon';

const App: React.FC = () => {
  const { pathname } = window.location;

  // This logic now ONLY handles stream requests, allowing the static manifest.json to be served.
  if (pathname.startsWith('/stream/')) {
    return <StremioHandler pathname={pathname} />;
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-stremio-background text-stremio-text-primary font-sans">
        <nav className="bg-stremio-surface p-4 shadow-lg">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-stremio-primary hover:text-stremio-secondary transition-colors">
              Gemini Reviews
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/logs" className="flex items-center text-stremio-text-secondary hover:text-stremio-text-primary transition-colors">
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Live Log
              </Link>
              <Link to="/configure" className="px-4 py-2 bg-stremio-primary text-white rounded-md hover:bg-stremio-secondary transition-colors">
                Configure
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/configure" element={<ConfigurePage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;