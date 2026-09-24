import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResourceReminders from '../ResourceReminders';
import { base44 } from '@/api/base44Client';

jest.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      ResourceReminder: {
        list: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      Notification: {
        create: jest.fn(),
      },
    },
  },
}));

jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  return (date) => actualMoment(date || '2024-01-15T12:00:00Z');
});

describe('ResourceReminders', () => {
  const mockReminders = [
    {
      id: '1',
      title: 'Application Deadline',
      client_name: 'John Doe',
      reminder_type: 'application_deadline',
      due_date: '2024-01-20',
      priority: 'high',
      status: 'pending',
      message: 'Submit housing application',
    },
    {
      id: '2',
      title: 'Document Deadline',
      client_name: 'Jane Smith',
      reminder_type: 'document_deadline',
      due_date: '2024-01-10',
      priority: 'critical',
      status: 'pending',
      message: 'Upload proof of income',
    },
    {
      id: '3',
      title: 'Application Deadline',
      client_name: 'John Doe',
      reminder_type: 'application_deadline',
      due_date: '2024-01-20',
      priority: 'high',
      status: 'pending',
      message: 'Submit housing application',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    base44.entities.ResourceReminder.list.mockResolvedValue(mockReminders);
    base44.entities.ResourceReminder.create.mockResolvedValue({ id: '4' });
    base44.entities.ResourceReminder.update.mockResolvedValue({});
    base44.entities.Notification.create.mockResolvedValue({});
  });

  test('deduplicates reminders on load', async () => {
    render(<ResourceReminders />);
    await waitFor(() => expect(base44.entities.ResourceReminder.list).toHaveBeenCalled());
    
    const cards = screen.getAllByText(/Application Deadline/);
    expect(cards.length).toBe(1);
  });

  test('prevents duplicate reminder creation', async () => {
    render(<ResourceReminders />);
    await waitFor(() => screen.getByText(/Deadline Engine/));

    fireEvent.click(screen.getByText(/Add Reminder/));
    
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Application Deadline' } });
    fireEvent.change(screen.getByLabelText(/Client Name/), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Due Date/), { target: { value: '2024-01-20' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Add Reminder/ }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/)).toBeInTheDocument();
    });
    
    expect(base44.entities.ResourceReminder.create).not.toHaveBeenCalled();
  });

  test('displays error banner on API failure', async () => {
    base44.entities.ResourceReminder.list.mockRejectedValueOnce(new Error('Network error'));
    
    render(<ResourceReminders />);
    
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  test('sends notification on reminder completion', async () => {
    render(<ResourceReminders />);
    await waitFor(() => screen.getByText(/John Doe/));

    const doneButton = screen.getAllByText(/Done/)[0];
    fireEvent.click(doneButton);

    await waitFor(() => {
      expect(base44.entities.Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Completed'),
          type: 'success',
        })
      );
    });
  });

  test('sends notification on reminder creation', async () => {
    render(<ResourceReminders />);
    await waitFor(() => screen.getByText(/Deadline Engine/));

    fireEvent.click(screen.getByText(/Add Reminder/));
    
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'New Deadline' } });
    fireEvent.change(screen.getByLabelText(/Client Name/), { target: { value: 'Bob Brown' } });
    fireEvent.change(screen.getByLabelText(/Due Date/), { target: { value: '2024-01-25' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Add Reminder/ }));

    await waitFor(() => {
      expect(base44.entities.Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('New Reminder'),
          action_url: '/resource-reminders',
        })
      );
    });
  });

  test('shows overdue count correctly', async () => {
    render(<ResourceReminders />);
    
    await waitFor(() => {
      const overdueCard = screen.getByText(/Overdue/).closest('div');
      expect(overdueCard).toHaveTextContent('1');
    });
  });

  test('dismisses error banner', async () => {
    base44.entities.ResourceReminder.list.mockRejectedValueOnce(new Error('Test error'));
    
    render(<ResourceReminders />);
    
    await waitFor(() => screen.getByText(/Test error/));
    
    fireEvent.click(screen.getByText(/Dismiss/));
    
    expect(screen.queryByText(/Test error/)).not.toBeInTheDocument();
  });
});
