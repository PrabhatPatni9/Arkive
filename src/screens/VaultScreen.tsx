import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Heart, Car, Briefcase, Shield, MoreHorizontal, Camera, Upload } from 'lucide-react'

const CATEGORIES = [
  { key: 'Medical',   Icon: Heart,          label: 'Medical' },
  { key: 'Legal',     Icon: Briefcase,      label: 'Legal' },
  { key: 'Identity',  Icon: Shield,         label: 'Identity' },
  { key: 'Financial', Icon: FileText,       label: 'Financial' },
  { key: 'Vehicles',  Icon: Car,            label: 'Vehicles' },
  { key: 'Other',     Icon: MoreHorizontal, label: 'Other' },
] as const

export function VaultScreen() {
  const [selected, setSelected] = useState<string | null>(null)
  const navigate = useNavigate()

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Vault</p>
          <p className="screen-subtitle">Encrypted family documents</p>
        </div>
      </header>

      <div className="screen-body">
        <div style={{ marginTop: 16 }} className="vault-categories">
          {CATEGORIES.map(({ key, Icon, label }) => (
            <button
              key={key}
              className={`vault-cat-btn${selected === key ? ' selected' : ''}`}
              type="button"
              onClick={() => setSelected(selected === key ? null : key)}
            >
              <Icon size={20} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            {selected ? `No ${selected} documents yet.` : 'No documents yet.'}
          </p>
          <button
            className="btn btn-primary"
            type="button"
            style={{ marginBottom: 10 }}
            onClick={() => navigate('/vault/capture')}
          >
            <Camera size={18} style={{ marginRight: 8 }} aria-hidden />
            Scan Document
          </button>
          <button className="btn btn-ghost" type="button">
            <Upload size={18} style={{ marginRight: 8 }} aria-hidden />
            Upload File
          </button>
        </div>
      </div>
    </main>
  )
}
