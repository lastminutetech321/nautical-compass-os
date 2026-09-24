import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44Client } from '../api/base44';
import { useAuth } from '../lib/auth-context';

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('coordinator_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('coordinator_session_id', sessionId);
  }
  return sessionId;
};

const detectRail = (pathname) => {
  if (pathname.includes('/dispatch')) return 'dispatch';
  if (pathname.includes('/workforce')) return 'workforce_hub';
  if (pathname.includes('/booking')) return 'booking_engine';
  if (pathname.includes('/scheduling') || pathname.includes('/schedule')) return 'scheduling';
  if (pathname.includes('/contract')) return 'contracts';
  if (pathname.includes('/coordinator')) return 'coordinator_hub';
  return null;
};

const isBrianCasto = (user) => {
  if (!user) return false;
  const email = user.email?.toLowerCase() || '';
  const name = user.name?.toLowerCase() || '';
  return email.includes('brian') || email.includes('casto') || name.includes('brian') || name.includes('casto');
};

export const useCoordinatorTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const sessionId = useRef(getSessionId());
  const pageStartTime = useRef(Date.now());
  const lastPath = useRef(location.pathname);
  const shouldTrack = isBrianCasto(user);

  const logAction = useCallback(async (actionType, details = {}) => {
    if (!shouldTrack || !user) return;
    try {
      await base44Client.entity('coordinator_usage_log').create({
        coordinator_id: user.id,
        coordinator_name: user.name || user.email,
        session_id: sessionId.current,
        timestamp: new Date().toISOString(),
        action_type: actionType,
        rail_used: detectRail(location.pathname),
        page_path: location.pathname,
        action_details: details,
        user_agent: navigator.userAgent,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        error_encountered: details.error ? true : false,
        error_message: details.error ? String(details.error) : null
      });
    } catch (error) {
      console.error('Coordinator tracking error:', error);
    }
  }, [shouldTrack, user, location.pathname]);

  useEffect(() => {
    if (!shouldTrack) return;
    const duration = Date.now() - pageStartTime.current;
    if (lastPath.current !== location.pathname && lastPath.current) {
      logAction('page_exit', { previous_path: lastPath.current, duration_ms: duration });
    }
    pageStartTime.current = Date.now();
    lastPath.current = location.pathname;
    logAction('page_view', { path: location.pathname, search: location.search, rail: detectRail(location.pathname) });
  }, [location, shouldTrack, logAction]);

  const trackEntityAction = useCallback((entityType, entityId, action, details = {}) => {
    if (!shouldTrack) return;
    logAction('entity_action', { entity_type: entityType, entity_id: entityId, action, ...details });
  }, [shouldTrack, logAction]);

  const trackFormSubmit = useCallback((formName, success, details = {}) => {
    if (!shouldTrack) return;
    logAction('form_submit', { form_name: formName, success, ...details });
  }, [shouldTrack, logAction]);

  const trackClick = useCallback((elementName, details = {}) => {
    if (!shouldTrack) return;
    logAction('click', { element: elementName, ...details });
  }, [shouldTrack, logAction]);

  const trackError = useCallback((error, context = {}) => {
    if (!shouldTrack) return;
    logAction('error', { error: error.message || String(error), stack: error.stack, ...context });
  }, [shouldTrack, logAction]);

  return { isTracking: shouldTrack, trackEntityAction, trackFormSubmit, trackClick, trackError, logAction };
};
