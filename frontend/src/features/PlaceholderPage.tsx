export function PlaceholderPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="card stack">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
