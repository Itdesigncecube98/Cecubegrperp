import { redirect } from 'next/navigation';

export default function MyAttendanceRecordsRedirect() {
  redirect('/dashboard/attendance/team-records');
}
