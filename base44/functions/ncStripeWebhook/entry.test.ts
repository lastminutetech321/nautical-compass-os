import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';

Deno.test('ncStripeWebhook: idempotency - duplicate event returns early', async () => {
  const mockEvent = {
    id: 'evt_test_duplicate_12345',
    type: 'invoice.paid',
    data: { object: { id: 'in_test', amount_paid: 5000, currency: 'usd' } },
    created: Math.floor(Date.now() / 1000)
  };

  const mockRequest = new Request('http://localhost/ncStripeWebhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mockEvent)
  });

  // Simulate duplicate event already exists
  const mockBase44 = {
    asServiceRole: {
      entities: {
        StripeEvent: {
          list: async ({ filter }) => {
            if (filter.event_id === mockEvent.id) return [{ id: 'existing_record', event_id: mockEvent.id }];
            return [];
          },
          create: async () => ({ id: 'new_record' }),
          update: async () => ({})
        }
      }
    }
  };

  // Stub createClientFromRequest
  const originalCreateClientFromRequest = globalThis.createClientFromRequest;
  globalThis.createClientFromRequest = () => mockBase44;

  try {
    const response = await fetch(mockRequest);
    const body = await response.json();
    assertEquals(body.status, 'duplicate');
    assertEquals(body.received, true);
  } finally {
    globalThis.createClientFromRequest = originalCreateClientFromRequest;
  }
});

Deno.test('ncStripeWebhook: invoice.paid uses obj.amount_paid correctly', async () => {
  const mockEvent = {
    id: 'evt_test_invoice_paid_67890',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_test_paid',
        invoice: 'in_test_paid',
        amount_paid: 7500, // 75.00 USD in cents
        amount_total: 7500,
        currency: 'usd',
        customer: 'cus_test',
        subscription: 'sub_test'
      }
    },
    created: Math.floor(Date.now() / 1000)
  };

  const mockRequest = new Request('http://localhost/ncStripeWebhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mockEvent)
  });

  let capturedInvoiceUpdate = null;

  const mockBase44 = {
    asServiceRole: {
      entities: {
        StripeEvent: {
          list: async () => [],
          create: async (data) => ({ id: 'stripe_event_1', ...data }),
          update: async () => ({})
        },
        Invoice: {
          list: async ({ filter }) => {
            if (filter.stripe_invoice_id === 'in_test_paid') {
              return [{ id: 'invoice_1', stripe_invoice_id: 'in_test_paid', status: 'open', amount_paid: 0 }];
            }
            return [];
          },
          update: async (id, data) => {
            capturedInvoiceUpdate = { id, ...data };
            return capturedInvoiceUpdate;
          }
        },
        FinancialTransaction: {
          create: async () => ({ id: 'ft_1' })
        }
      }
    }
  };

  const originalCreateClientFromRequest = globalThis.createClientFromRequest;
  globalThis.createClientFromRequest = () => mockBase44;

  try {
    const response = await fetch(mockRequest);
    const body = await response.json();
    assertEquals(response.status, 200);
    assertEquals(body.received, true);
    assertEquals(body.action_taken, 'invoice:invoice.paid');

    // Verify amount_paid is correctly set to 75.00 (7500 cents / 100)
    assertEquals(capturedInvoiceUpdate?.amount_paid, 75.00);
    assertEquals(capturedInvoiceUpdate?.status, 'paid');
  } finally {
    globalThis.createClientFromRequest = originalCreateClientFromRequest;
  }
});

Deno.test('ncStripeWebhook: invoice.paid without amount_paid field uses 0', async () => {
  const mockEvent = {
    id: 'evt_test_invoice_no_amount',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_test_no_amount',
        invoice: 'in_test_no_amount',
        amount_total: 0, // No amount_paid field present
        currency: 'usd',
        customer: 'cus_test'
      }
    },
    created: Math.floor(Date.now() / 1000)
  };

  const mockRequest = new Request('http://localhost/ncStripeWebhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mockEvent)
  });

  let capturedInvoiceUpdate = null;

  const mockBase44 = {
    asServiceRole: {
      entities: {
        StripeEvent: {
          list: async () => [],
          create: async (data) => ({ id: 'stripe_event_2', ...data }),
          update: async () => ({})
        },
        Invoice: {
          list: async ({ filter }) => {
            if (filter.stripe_invoice_id === 'in_test_no_amount') {
              return [{ id: 'invoice_2', stripe_invoice_id: 'in_test_no_amount', status: 'open', amount_paid: 0 }];
            }
            return [];
          },
          update: async (id, data) => {
            capturedInvoiceUpdate = { id, ...data };
            return capturedInvoiceUpdate;
          }
        },
        FinancialTransaction: {
          create: async () => ({ id: 'ft_2' })
        }
      }
    }
  };

  const originalCreateClientFromRequest = globalThis.createClientFromRequest;
  globalThis.createClientFromRequest = () => mockBase44;

  try {
    const response = await fetch(mockRequest);
    const body = await response.json();
    assertEquals(response.status, 200);
    assertEquals(body.received, true);

    // Verify amount_paid is 0 when obj.amount_paid is missing
    assertEquals(capturedInvoiceUpdate?.amount_paid, 0);
    assertEquals(capturedInvoiceUpdate?.status, 'paid');
  } finally {
    globalThis.createClientFromRequest = originalCreateClientFromRequest;
  }
});
