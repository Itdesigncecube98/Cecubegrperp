import { redirect } from 'next/navigation';

export default function LegacyLeavingReasonsRedirect() {
  redirect('/dashboard/synchronisation2/leaving-reasons');
}
