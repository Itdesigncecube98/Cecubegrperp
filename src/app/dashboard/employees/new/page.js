'use client';

import EmployeeProfilePage from '../[id]/page';

export default function NewEmployeePage() {
  return <EmployeeProfilePage params={Promise.resolve({ id: 'new' })} />;
}
