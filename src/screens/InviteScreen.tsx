import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Share2, QrCode, UserCheck } from 'lucide-react'
import { getFamily } from '../family/familyStore'

/**
 * Invite screen (admin only). Surfaces the Family ID, a shareable join link, and a QR code so a
 * new member can request to join. The Family ID is a 128-bit secret capability — the relay is
 * blind, so sharing it lets someone REQUEST to join; the admin still has to approve the request
 * and match the verification code before any key is handed over. Nothing secret is exposed by the
 * link beyond that request capability.
 */
export function InviteScreen() {
  const navigate = useNavigate()
  const family = getFamily()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState<'id' | 'link' | null>(null)

  const familyId = family?.familyId ?? ''
  const joinLink = `${window.location.origin}/onboarding/join?fid=${familyId}`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !familyId) return
    import('qrcode')
      .then(QRCode => QRCode.toCanvas(canvas, joinLink, { width: 220, margin: 2 }))
      .catch(() => { /* qrcode unavailable — the link + ID still work */ })
  }, [joinLink, familyId])

  if (!family) { navigate('/onboarding', { replace: true }); return null }
  if (family.role !== 'admin') {
    return (
      <main className="screen">
        <header className="screen-header" style={{ paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="icon-btn" onClick={() => navigate('/family')}><ArrowLeft size={20} /></button>
            <p className="screen-title">Invite</p>
          </div>
        </header>
        <div className="screen-body" style={{ paddingTop: 24, textAlign: 'center' }}>
          <p className="text-muted">Only an admin can invite new members. Ask your family admin to send you a link.</p>
        </div>
      </main>
    )
  }

  function copy(kind: 'id' | 'link', value: string) {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  async function share() {
    const text = `Join our family vault on ARKHIVE.\n\nOpen this link on your phone:\n${joinLink}\n\nOr enter Family ID: ${familyId}`
    try {
      if (navigator.share) { await navigator.share({ title: 'Join our ARKHIVE family', text }); return }
    } catch { /* user cancelled or unsupported — fall through to copy */ }
    copy('link', joinLink)
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="icon-btn" onClick={() => navigate('/family')}><ArrowLeft size={20} /></button>
          <div>
            <p className="screen-title">Invite a member</p>
            <p className="screen-subtitle">Share the link, then approve their request</p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 8 }}>
        {/* QR */}
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
            <QrCode size={14} /> Scan with the new member's phone camera
          </div>
          <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
            <canvas ref={canvasRef} width={220} height={220} aria-label="Join QR code" />
          </div>
        </div>

        {/* Share link */}
        <button type="button" className="btn btn-primary" style={{ marginBottom: 12 }} onClick={share}>
          <Share2 size={16} style={{ marginRight: 8 }} /> Share invite link
        </button>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <p className="form-label">Join link</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', lineHeight: 1.5 }}>{joinLink}</code>
            <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'auto', flexShrink: 0 }} onClick={() => copy('link', joinLink)}>
              {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Family ID (manual entry fallback) */}
        <div className="card card-p" style={{ marginBottom: 20 }}>
          <p className="form-label">Family ID (manual entry)</p>
          <p className="form-hint">If they can't open the link, they can type this Family ID on the Join screen.</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontSize: 14, color: 'var(--text)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{familyId}</code>
            <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'auto', flexShrink: 0 }} onClick={() => copy('id', familyId)}>
              {copied === 'id' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* How it works */}
        <p className="section-header" style={{ marginTop: 0 }}>How it works</p>
        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, counterReset: 'step' }}>
          {[
            'They open the link (or enter the Family ID) and send a join request.',
            'You get their request here and approve it.',
            'A 6-digit code shows on both phones — confirm they match, and they are in.',
          ].map((text, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</span>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{text}</p>
            </li>
          ))}
        </ol>

        <button type="button" className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => navigate('/family/approve-join')}>
          <UserCheck size={16} style={{ marginRight: 8 }} /> Go to pending requests
        </button>
      </div>
    </main>
  )
}
