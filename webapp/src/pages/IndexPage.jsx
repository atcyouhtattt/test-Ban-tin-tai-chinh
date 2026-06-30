import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function IndexPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, this data would be fetched from the public folder
    fetch('/data/entries.json')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch entries:', err);
        setLoading(false);
        // Fallback dummy data for preview
        setEntries([
          { id: '2026-06-30', title: 'Dow Jones lập kỷ lục, Bitcoin áp lực dưới 60K' }
        ]);
      });
  }, []);

  if (loading) {
    return <div className="loader">Đang tải danh sách bản tin...</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
        Bản tin gần đây
      </h2>
      <div className="newsletter-list">
        {entries.length === 0 ? (
          <p>Chưa có bản tin nào.</p>
        ) : (
          entries.map((entry) => (
            <Link to={`/newsletter/${entry.id}`} key={entry.id} className="newsletter-card">
              <div className="newsletter-card-date">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {entry.id}
              </div>
              <div className="newsletter-card-title">{entry.title}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
