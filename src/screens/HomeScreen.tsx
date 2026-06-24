export function HomeScreen() {
  return (
    <main className="screen">
      <header className="screen-header">
        <h1>Arkive</h1>
        <p className="screen-subtitle">Your family vault</p>
      </header>
      <section className="screen-body">
        <p className="text-muted">End-to-end encrypted. Operator never sees your data.</p>
        <div className="card-grid">
          <div className="card">
            <h2>Documents</h2>
            <p>Secure family records</p>
          </div>
          <div className="card">
            <h2>Members</h2>
            <p>Family profiles</p>
          </div>
          <div className="card">
            <h2>Medical</h2>
            <p>Health records</p>
          </div>
          <div className="card">
            <h2>Legal</h2>
            <p>Wills, IDs</p>
          </div>
        </div>
      </section>
    </main>
  )
}
