import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard (no authentication required for MVP)
  redirect('/dashboard');
}
