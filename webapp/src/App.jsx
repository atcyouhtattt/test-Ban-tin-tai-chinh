import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import IndexPage from './pages/IndexPage';
import NewsletterDetail from './pages/NewsletterDetail';
import './index.css';

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check user preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <HashRouter>
      <div className="container">
        <header className="header">
          <Link to="/" className="header-title">📈 Bản tin TTCK</Link>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/newsletter/:date" element={<NewsletterDetail />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
