import { useState } from 'react';
import { Bell, Send, CheckCircle } from 'lucide-react';
import { subscribe } from '../api.js';

const TOPICS = [
  'Bảo vệ nền tảng tư tưởng',
  'An ninh mạng',
  'Chính sách pháp luật',
  'Phòng chống tham nhũng',
  'Đối ngoại - Chủ quyền',
];

export default function DangKy() {
  const [form, setForm] = useState({ name: '', email: '', organization: '', topics: '', channel: 'Email' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.topics) {
      setError('Vui lòng điền đầy đủ họ tên, email và chủ đề.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await subscribe(form);
      if (res.success === false) throw new Error(res.error || 'Có lỗi xảy ra.');
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Không đăng ký được. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="page page-fade">
      <div className="page-header">
        <h1>Đăng ký bản tin</h1>
      </div>
      <div className="card elevated" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <CheckCircle size={48} color="var(--ok)" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Đăng ký thành công!</div>
        <div className="text-sm text-soft" style={{ marginBottom: 20 }}>Bạn sẽ nhận bản tin qua <strong>{form.channel}</strong> về chủ đề đã chọn.</div>
        <button className="btn ghost full" onClick={() => { setSuccess(false); setForm({ name: '', email: '', organization: '', topics: '', channel: 'Email' }); }}>
          Đăng ký thêm
        </button>
      </div>
    </div>
  );

  return (
    <div className="page page-fade">
      <div className="page-header">
        <h1>Đăng ký bản tin</h1>
        <p>Nhận thông tin chọn lọc qua Email hoặc Telegram</p>
      </div>

      <form onSubmit={submit}>
        <div className="card elevated" style={{ marginBottom: 14 }}>
          <div className="section-label">Thông tin cá nhân</div>

          <div className="field-group">
            <label className="field-label">Họ và tên *</label>
            <input className="field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nguyễn Văn A" />
          </div>
          <div className="field-group">
            <label className="field-label">Email *</label>
            <input className="field" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@domain.vn" />
          </div>
          <div className="field-group">
            <label className="field-label">Đơn vị công tác</label>
            <input className="field" value={form.organization} onChange={e => set('organization', e.target.value)} placeholder="PA01 - Công an tỉnh Phú Thọ" />
          </div>
        </div>

        <div className="card elevated" style={{ marginBottom: 14 }}>
          <div className="section-label">Chủ đề quan tâm *</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TOPICS.map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${form.topics === t ? 'var(--red)' : 'var(--line)'}`, background: form.topics === t ? 'var(--red-soft)' : 'var(--surface)', cursor: 'pointer', transition: 'all .15s' }}>
                <input type="radio" name="topics" value={t} checked={form.topics === t} onChange={() => set('topics', t)} style={{ accentColor: 'var(--red)' }} />
                <span className="text-sm" style={{ fontWeight: 500, color: form.topics === t ? 'var(--red)' : 'var(--ink)' }}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card tinted" style={{ marginBottom: 16 }}>
          <div className="section-label">Kênh nhận tin</div>
          <div className="row" style={{ gap: 8 }}>
            {['Email', 'Telegram'].map(ch => (
              <button key={ch} type="button" onClick={() => set('channel', ch)}
                className={`btn ${form.channel === ch ? 'primary' : 'ghost'}`}
                style={{ flex: 1 }}>
                {ch === 'Email' ? '📧' : '💬'} {ch}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="msg error" style={{ marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn primary full" disabled={loading}>
          {loading ? 'Đang đăng ký...' : <><Send size={16} /> Đăng ký nhận bản tin</>}
        </button>
      </form>
    </div>
  );
}
