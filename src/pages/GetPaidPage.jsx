import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function GetPaidPage() {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Get Paid</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This page will display payment tracking, invoices, and revenue metrics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
