import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export default function NewsletterDetail() {
  const { date } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/data/${date}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch detail:', err);
        setLoading(false);
        // Fallback for previewing
        setData({
          title: "Dow Jones lập kỷ lục, Bitcoin áp lực dưới 60K",
          summary: "Thị trường toàn cầu tiếp tục hưng phấn khi Dow Jones lập đỉnh mới. Trong khi đó, dòng tiền vào Crypto có dấu hiệu chững lại.",
          metrics: [
            { label: "VN-Index", value: "1,250.45", trend: "up" },
            { label: "Dow Jones", value: "39,500.12", trend: "up" },
            { label: "Bitcoin", value: "$59,200", trend: "down" },
          ],
          sections: [
            {
              id: "01",
              title: "Qua đêm — Toàn cầu",
              content: "Thị trường Mỹ ghi nhận phiên tăng điểm tích cực. Các cổ phiếu công nghệ tiếp tục dẫn dắt đà tăng."
            }
          ],
          sources: [
            { name: "Vietstock", title: "Dow Jones lập kỷ lục mới", url: "#" }
          ]
        });
      });
  }, [date]);

  if (loading) {
    return <div className="loader">Đang tải nội dung bản tin...</div>;
  }

  if (!data) {
    return <div>Không tìm thấy dữ liệu bản tin.</div>;
  }

  return (
    <article>
      <Link to="/" className="back-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Quay lại
      </Link>

      <header className="detail-header">
        <h1 className="detail-title">{data.title}</h1>
        <p className="detail-summary">{data.summary}</p>
      </header>

      {data.metrics && data.metrics.length > 0 && (
        <div className="metrics-grid">
          {data.metrics.map((metric, i) => (
            <div className="metric-card" key={i}>
              <div className="metric-label">{metric.label}</div>
              <div className={`metric-value trend-${metric.trend}`}>
                {metric.trend === 'up' && '▲ '}
                {metric.trend === 'down' && '▼ '}
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.sections && data.sections.map((section) => (
        <section className="section" key={section.id}>
          <h2 className="section-title">
            <span style={{ color: 'var(--color-accent)' }}>§</span> {section.title}
          </h2>
          <div className="section-content markdown-body">
            <ReactMarkdown>{section.content}</ReactMarkdown>
          </div>
        </section>
      ))}

      {data.sources && data.sources.length > 0 && (
        <div className="sources">
          <h3>Nguồn tham khảo</h3>
          <div className="sources-list">
            {data.sources.map((source, i) => (
              <div className="source-item" key={i}>
                <strong>{source.name}</strong>: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
