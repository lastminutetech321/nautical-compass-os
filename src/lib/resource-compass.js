/**
 * Resource Compass - Resource Discovery & Navigation System
 * Provides intelligent resource discovery, classification, and navigation
 */

import { base44 } from '../api/client';

/**
 * Resource types supported by the compass
 */
export const RESOURCE_TYPES = {
  ENTITY: 'entity',
  FUNCTION: 'function',
  WORKFLOW: 'workflow',
  AGENT: 'agent',
  PAGE: 'page',
  COMPONENT: 'component',
  CANON: 'canon',
  GOVERNANCE: 'governance',
  DOCUMENTATION: 'documentation'
};

/**
 * Resource categories for classification
 */
export const RESOURCE_CATEGORIES = {
  CORE: 'core',
  FEATURE: 'feature',
  INTEGRATION: 'integration',
  UTILITY: 'utility',
  GOVERNANCE: 'governance',
  DOCUMENTATION: 'documentation'
};

/**
 * Discover resources based on criteria
 * @param {Object} criteria - Search criteria
 * @param {string} criteria.type - Resource type filter
 * @param {string} criteria.category - Category filter
 * @param {string} criteria.query - Text search query
 * @param {Array<string>} criteria.tags - Tag filters
 * @returns {Promise<Array>} Discovered resources
 */
export async function discoverResources(criteria = {}) {
  try {
    const resources = [];
    
    // Discover entities
    if (!criteria.type || criteria.type === RESOURCE_TYPES.ENTITY) {
      const entities = await base44.entities.list();
      resources.push(...entities.map(e => ({
        id: e.id,
        name: e.name,
        type: RESOURCE_TYPES.ENTITY,
        category: classifyEntityCategory(e),
        description: e.description || '',
        path: `/entities/${e.id}`,
        metadata: e
      })));
    }
    
    // Discover functions
    if (!criteria.type || criteria.type === RESOURCE_TYPES.FUNCTION) {
      const functions = await base44.functions.list();
      resources.push(...functions.map(f => ({
        id: f.id,
        name: f.name,
        type: RESOURCE_TYPES.FUNCTION,
        category: classifyFunctionCategory(f),
        description: f.description || '',
        path: `/functions/${f.id}`,
        metadata: f
      })));
    }
    
    // Discover workflows
    if (!criteria.type || criteria.type === RESOURCE_TYPES.WORKFLOW) {
      const workflows = await base44.workflows.list();
      resources.push(...workflows.map(w => ({
        id: w.id,
        name: w.name,
        type: RESOURCE_TYPES.WORKFLOW,
        category: RESOURCE_CATEGORIES.FEATURE,
        description: w.description || '',
        path: `/workflows/${w.id}`,
        metadata: w
      })));
    }
    
    // Apply filters
    let filtered = resources;
    
    if (criteria.category) {
      filtered = filtered.filter(r => r.category === criteria.category);
    }
    
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
      );
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      filtered = filtered.filter(r => 
        criteria.tags.some(tag => 
          r.metadata.tags?.includes(tag)
        )
      );
    }
    
    return filtered;
  } catch (error) {
    console.error('Resource discovery failed:', error);
    throw new Error(`Failed to discover resources: ${error.message}`);
  }
}

/**
 * Classify entity into category
 */
function classifyEntityCategory(entity) {
  const name = entity.name.toLowerCase();
  
  // Core entities
  if (['user', 'auth', 'session', 'profile'].some(k => name.includes(k))) {
    return RESOURCE_CATEGORIES.CORE;
  }
  
  // Integration entities
  if (['github', 'stripe', 'oauth', 'webhook'].some(k => name.includes(k))) {
    return RESOURCE_CATEGORIES.INTEGRATION;
  }
  
  // Governance entities
  if (['canon', 'governance', 'policy', 'compliance'].some(k => name.includes(k))) {
    return RESOURCE_CATEGORIES.GOVERNANCE;
  }
  
  return RESOURCE_CATEGORIES.FEATURE;
}

/**
 * Classify function into category
 */
function classifyFunctionCategory(func) {
  const name = func.name.toLowerCase();
  
  // Integration functions
  if (['github', 'stripe', 'webhook', 'api'].some(k => name.includes(k))) {
    return RESOURCE_CATEGORIES.INTEGRATION;
  }
  
  // Utility functions
  if (['validate', 'format', 'parse', 'transform'].some(k => name.includes(k))) {
    return RESOURCE_CATEGORIES.UTILITY;
  }
  
  return RESOURCE_CATEGORIES.FEATURE;
}

/**
 * Get resource dependencies
 * @param {string} resourceId - Resource identifier
 * @param {string} resourceType - Resource type
 * @returns {Promise<Array>} List of dependencies
 */
export async function getResourceDependencies(resourceId, resourceType) {
  try {
    const dependencies = [];
    
    if (resourceType === RESOURCE_TYPES.ENTITY) {
      const entity = await base44.entities.get(resourceId);
      
      // Check for related entities in fields
      if (entity.fields) {
        for (const field of entity.fields) {
          if (field.type === 'relation' && field.entity) {
            dependencies.push({
              id: field.entity,
              type: RESOURCE_TYPES.ENTITY,
              relationship: 'relation',
              field: field.name
            });
          }
        }
      }
    }
    
    if (resourceType === RESOURCE_TYPES.WORKFLOW) {
      const workflow = await base44.workflows.get(resourceId);
      
      // Check for function calls in workflow steps
      if (workflow.steps) {
        for (const step of workflow.steps) {
          if (step.type === 'function' && step.functionId) {
            dependencies.push({
              id: step.functionId,
              type: RESOURCE_TYPES.FUNCTION,
              relationship: 'calls',
              step: step.name
            });
          }
        }
      }
    }
    
    return dependencies;
  } catch (error) {
    console.error('Failed to get resource dependencies:', error);
    return [];
  }
}

/**
 * Get resource usage/impact analysis
 * @param {string} resourceId - Resource identifier
 * @param {string} resourceType - Resource type
 * @returns {Promise<Object>} Usage analysis
 */
export async function getResourceUsage(resourceId, resourceType) {
  try {
    const usage = {
      usedBy: [],
      uses: [],
      impact: 'low'
    };
    
    // Get what uses this resource
    if (resourceType === RESOURCE_TYPES.ENTITY) {
      const allEntities = await base44.entities.list();
      for (const entity of allEntities) {
        if (entity.fields) {
          for (const field of entity.fields) {
            if (field.type === 'relation' && field.entity === resourceId) {
              usage.usedBy.push({
                id: entity.id,
                name: entity.name,
                type: RESOURCE_TYPES.ENTITY
              });
            }
          }
        }
      }
    }
    
    // Get what this resource uses
    const dependencies = await getResourceDependencies(resourceId, resourceType);
    usage.uses = dependencies;
    
    // Calculate impact
    if (usage.usedBy.length > 10) {
      usage.impact = 'high';
    } else if (usage.usedBy.length > 3) {
      usage.impact = 'medium';
    }
    
    return usage;
  } catch (error) {
    console.error('Failed to analyze resource usage:', error);
    return { usedBy: [], uses: [], impact: 'unknown' };
  }
}

/**
 * Generate resource map for visualization
 * @returns {Promise<Object>} Resource map
 */
export async function generateResourceMap() {
  try {
    const resources = await discoverResources();
    
    const map = {
      nodes: resources.map(r => ({
        id: r.id,
        label: r.name,
        type: r.type,
        category: r.category
      })),
      edges: []
    };
    
    // Build edges from dependencies
    for (const resource of resources) {
      const deps = await getResourceDependencies(resource.id, resource.type);
      for (const dep of deps) {
        map.edges.push({
          source: resource.id,
          target: dep.id,
          type: dep.relationship
        });
      }
    }
    
    return map;
  } catch (error) {
    console.error('Failed to generate resource map:', error);
    throw new Error(`Resource map generation failed: ${error.message}`);
  }
}

export default {
  RESOURCE_TYPES,
  RESOURCE_CATEGORIES,
  discoverResources,
  getResourceDependencies,
  getResourceUsage,
  generateResourceMap
};
