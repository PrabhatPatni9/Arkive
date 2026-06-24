export function FamilyScreen() {
  return (
    <main className="screen">
      <header className="screen-header">
        <h1>Family</h1>
      </header>
      <section className="screen-body">
        <div className="member-list">
          <div className="member-card">
            <div className="member-avatar" aria-label="Member placeholder">A</div>
            <div className="member-info">
              <p className="member-name">Admin</p>
              <p className="member-role">Full account &middot; Admin</p>
            </div>
          </div>
        </div>
        <button className="btn-primary" type="button">Add Member</button>
        <button className="btn-secondary" type="button">Invite via QR</button>
      </section>
    </main>
  )
}
