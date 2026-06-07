import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-8 text-center bg-bg">
      <span className="text-5xl mb-4">🔍</span>
      <h1 className="text-2xl font-bold text-text mb-2">Page Not Found</h1>
      <p className="text-sm text-text-2 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-xl hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
