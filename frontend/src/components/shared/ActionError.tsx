export default function ActionError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
    >
      {message}
    </div>
  );
}
