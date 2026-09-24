import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditLogViewer from '../AuditLogViewer';
import { base44 } from '@/api/base44Client';

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      AuditLog: {
        list: vi.fn(),
        create: vi.fn(),
      },
    },
    auth: {
      me: vi.fn(),
    },
  },
}));

vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children, ...props }) => <div {...props}>{children}</div> }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children, ...props }) => <span {...props}>{children}</span> }));
vi.mock('@/components/ui/select', () => ({ Select: ({ children }) => <div>{children}</div>, SelectContent: ({ children }) => <div>{children}</div>, SelectItem: ({ children, ...props }) => <option {...props}>{children}</option>, SelectTrigger: ({ children }) => <button>{children}</button>, SelectValue: () => null }));

describe('AuditLogViewer - Integrity Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    base44.auth.me.mockResolvedValue({ id: '1', full_name: 'Test User', email: 'test@example.com', role: 'admin' });
  });

  it('detects temporal anomalies in audit logs', async () => {
    const logsWithAnomaly = [
      { id: '1', action: 'Action 1', action_category: 'create', actor_name: 'User 1', created_date: '2024-01-02T10:00:00Z', risk_level: 'low' },
      { id: '2', action: 'Action 2', action_category: 'update', actor_name: 'User 2', created_date: '2024-01-01T10:00:00Z', risk_level: 'low' },
    ];
    base44.entities.AuditLog.list.mockResolvedValue(logsWithAnomaly);
    render(<AuditLogViewer />);
    await waitFor(() => {
      expect(screen.getByText(/out-of-sequence timestamps/i)).toBeInTheDocument();
    });
  });

  it('detects missing critical fields', async () => {
    const logsWithMissingFields = [
      { id: '1', action: 'Action 1', action_category: 'create', created_date: '2024-01-01T10:00:00Z', risk_level: 'low' },
      { id: '2', action_category: 'update', actor_name: 'User 2', created_date: '2024-01-02T10:00:00Z', risk_level: 'low' },
    ];
    base44.entities.AuditLog.list.mockResolvedValue(logsWithMissingFields);
    render(<AuditLogViewer />);
    await waitFor(() => {
      expect(screen.getByText(/incomplete data/i)).toBeInTheDocument();
    });
  });

  it('detects high volume suspicious activity', async () => {
    const highVolumeLogs = Array.from({ length: 105 }, (_, i) => ({
      id: `${i}`,
      action: `Action ${i}`,
      action_category: 'create',
      actor_name: 'Suspicious Actor',
      created_date: `2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
      risk_level: 'low',
    }));
    base44.entities.AuditLog.list.mockResolvedValue(highVolumeLogs);
    render(<AuditLogViewer />);
    await waitFor(() => {
      expect(screen.getByText(/Unusual activity volume/i)).toBeInTheDocument();
    });
  });

  it('detects high-risk action spike', async () => {
    const now = new Date();
    const recentHighRiskLogs = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      action: `High Risk Action ${i}`,
      action_category: 'delete',
      actor_name: 'User',
      created_date: new Date(now.getTime() - i * 60000).toISOString(),
      risk_level: 'critical',
    }));
    base44.entities.AuditLog.list.mockResolvedValue(recentHighRiskLogs);
    render(<AuditLogViewer />);
    await waitFor(() => {
      expect(screen.getByText(/high-risk actions in last 24h/i)).toBeInTheDocument();
    });
  });

  it('exports CSV with proper escaping', async () => {
    const logs = [
      { id: '1', action: 'Action with "quotes"', action_category: 'create', actor_name: 'User, Name', created_date: '2024-01-01T10:00:00Z', risk_level: 'low', actor_role: 'admin', entity_type: 'Test', entity_name: 'Entity' },
    ];
    base44.entities.AuditLog.list.mockResolvedValue(logs);
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    render(<AuditLogViewer />);
    await waitFor(() => screen.getByText(/Export CSV/i));
    const exportButton = screen.getByText(/Export CSV/i);
    await userEvent.click(exportButton);
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('handles load errors gracefully', async () => {
    base44.entities.AuditLog.list.mockRejectedValue(new Error('Network error'));
    render(<AuditLogViewer />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load audit logs/i)).toBeInTheDocument();
    });
  });

  it('displays last verification timestamp', async () => {
    base44.entities.AuditLog.list.mockResolvedValue([]);
    render(<AuditLogViewer />);
    await waitFor(() => {
      expect(screen.getByText(/Last verified:/i)).toBeInTheDocument();
    });
  });
});
