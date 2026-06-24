const VAULT_CATEGORIES = ['Medical', 'Legal', 'Financial', 'Identity', 'Insurance', 'Other'] as const

export function VaultScreen() {
  return (
    <main className="screen">
      <header className="screen-header">
        <h1>Vault</h1>
      </header>
      <section className="screen-body">
        <div className="vault-categories">
          {VAULT_CATEGORIES.map(cat => (
            <button key={cat} className="vault-category-btn" type="button">
              {cat}
            </button>
          ))}
        </div>
        <div className="vault-empty">
          <p className="text-muted">No documents yet.</p>
          <button className="btn-primary" type="button">Scan Document</button>
          <button className="btn-secondary" type="button">Upload File</button>
        </div>
      </section>
    </main>
  )
}
