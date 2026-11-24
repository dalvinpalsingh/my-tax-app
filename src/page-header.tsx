import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-title">
        <div>
          <h1>{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}
