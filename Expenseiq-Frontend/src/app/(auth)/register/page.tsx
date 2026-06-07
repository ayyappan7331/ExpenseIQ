'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The register flow is now embedded inside the login page as an inline panel.
// Navigating directly to /register redirects to /login where the user can
// click "Create one" to open the register panel.
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return null;
}
