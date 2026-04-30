export function HomePage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="display-5 mb-2">AI Workforce Operating System</h1>
        <p className="muted lead">
          AI-driven staffing for HR teams. Forecast demand, optimize allocation, monitor
          performance — all without leaving your workflow.
        </p>
      </header>

      <section className="row g-4">
        <article className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Predict</h5>
              <p className="card-text muted">
                Time-series forecasts of staffing demand with confidence intervals.
              </p>
            </div>
          </div>
        </article>
        <article className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Recommend</h5>
              <p className="card-text muted">
                Personalized hiring and allocation recommendations with explainability.
              </p>
            </div>
          </div>
        </article>
        <article className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Govern</h5>
              <p className="card-text muted">
                Audit trails, role-based access, encryption at rest. Compliance-ready.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
