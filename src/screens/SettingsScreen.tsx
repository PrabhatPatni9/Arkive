const SETTINGS_SECTIONS = [
  {
    heading: 'Recovery',
    rows: ['View Recovery Code', 'Trusted Contacts', 'Shamir Backup'],
  },
  {
    heading: 'Security',
    rows: ['Biometric Lock', 'Key Rotation', 'Manage Devices'],
  },
  {
    heading: 'Family',
    rows: ['Family Settings', 'Node Management'],
  },
] as const

export function SettingsScreen() {
  return (
    <main className="screen">
      <header className="screen-header">
        <h1>Settings</h1>
      </header>
      <section className="screen-body">
        {SETTINGS_SECTIONS.map(({ heading, rows }) => (
          <div key={heading} className="settings-section">
            <h2 className="settings-section-heading">{heading}</h2>
            {rows.map(label => (
              <button key={label} className="settings-row" type="button">
                {label}
              </button>
            ))}
          </div>
        ))}
        <div className="settings-section">
          <h2 className="settings-section-heading">About</h2>
          <div className="settings-row static">
            <span>Version</span>
            <span>0.0.1</span>
          </div>
        </div>
      </section>
    </main>
  )
}
