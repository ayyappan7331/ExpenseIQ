import { redirect } from 'next/navigation';

// The legacy SPA opens on the Dashboard tab. Mirror that — anyone landing
// on `/` gets bounced to `/dashboard`. /themes and /debug stay directly
// accessible as standalone developer routes.

export default function RootPage(): never {
  redirect('/dashboard');
}
