import { redirect } from 'next/navigation';

export default function NewRequisitionRedirect() {
  redirect('/purchase/pr/create');
}
