/**
 * useResourceCompass - React hook for Resource Compass
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  discoverResources,
  getResourceDependencies,
  getResourceUsage,
  generateResourceMap,
  RESOURCE_TYPES,
  RESOURCE_CATEGORIES
} from '../lib/resource-compass';

/**
 * Hook to discover resources
 */
export function useResourceDiscovery(criteria = {}, options = {}) {
  return useQuery({
    queryKey: ['resources', 'discover', criteria],
    queryFn: () => discoverResources(criteria),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options
  });
}

/**
 * Hook to get resource dependencies
 */
export function useResourceDependencies(resourceId, resourceType, options = {}) {
  return useQuery({
    queryKey: ['resources', 'dependencies', resourceId, resourceType],
    queryFn: () => getResourceDependencies(resourceId, resourceType),
    enabled: !!(resourceId && resourceType),
    staleTime: 1000 * 60 * 5,
    ...options
  });
}

/**
 * Hook to get resource usage
 */
export function useResourceUsage(resourceId, resourceType, options = {}) {
  return useQuery({
    queryKey: ['resources', 'usage', resourceId, resourceType],
    queryFn: () => getResourceUsage(resourceId, resourceType),
    enabled: !!(resourceId && resourceType),
    staleTime: 1000 * 60 * 5,
    ...options
  });
}

/**
 * Hook to generate resource map
 */
export function useResourceMap(options = {}) {
  return useQuery({
    queryKey: ['resources', 'map'],
    queryFn: () => generateResourceMap(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options
  });
}

/**
 * Hook to search resources
 */
export function useResourceSearch(query, options = {}) {
  return useQuery({
    queryKey: ['resources', 'search', query],
    queryFn: () => discoverResources({ query }),
    enabled: !!query && query.length > 2,
    staleTime: 1000 * 60 * 2,
    ...options
  });
}

export { RESOURCE_TYPES, RESOURCE_CATEGORIES };
