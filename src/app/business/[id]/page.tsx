import React from 'react';
import { notFound } from 'next/navigation';
import { BusinessRepository } from '@/repositories/BusinessRepository';
import BusinessDossierClient from './BusinessDossierClient';

export const revalidate = 0; // live data only

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BusinessDetailPage({ params }: Props) {
  const { id } = await params;
  
  const businessRepo = new BusinessRepository();
  const business = await businessRepo.findById(id);

  if (!business) {
    notFound();
  }

  // Cast JSON types properly for React client boundaries if needed
  const serializedBusiness = JSON.parse(JSON.stringify(business));

  return <BusinessDossierClient business={serializedBusiness} />;
}
