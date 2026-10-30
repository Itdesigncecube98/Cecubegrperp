'use client';

import React, { use } from 'react';
import TenderDetailsForm from '../../TenderDetailsForm';

export default function TenderDetails({ params }) {
  const { id } = use(params);
  return <TenderDetailsForm id={id} />;
}
