import React, { useEffect, useState } from 'react';
import { getCurrentUser, signOut } from '../utils/auth';
import type { User } from '@supabase/supabase-js';

interface BridgeWelcomeCardProps {
  onComplete?: () => void;
}

export function BridgeWelcomeCard({ onComplete }: BridgeWelcomeCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Welcome to the Bridge</h2>
      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : user ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2"><strong>Signed in as:</strong></p>
            <p className="font-medium text-gray-900 mb-3">{user.email || 'Unknown user'}</p>
            <button onClick={handleSignOut} className="text-sm text-blue-600 hover:text-blue-800 underline">Not you? Sign out</button>
          </div>
          <p className="text-gray-700">The Bridge is your unified dashboard for managing packets, campaigns, and insights.</p>
          {onComplete && <button onClick={onComplete} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Continue</button>}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-700">You are not signed in. Please sign in to access the Bridge.</p>
          <a href="/login" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Sign In</a>
        </div>
      )}
    </div>
  );
}
