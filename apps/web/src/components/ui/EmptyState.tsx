interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="pt-empty">
      {icon && <div className="pt-empty-icon">{icon}</div>}
      <h3 className="pt-empty-title">{title}</h3>
      {description && <p className="pt-empty-desc">{description}</p>}
      {action && <div className="pt-empty-action">{action}</div>}
    </div>
  );
}
