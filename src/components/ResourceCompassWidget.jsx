/**
 * ResourceCompassWidget - UI component for resource navigation
 */

import React, { useState } from 'react';
import { useResourceDiscovery, useResourceSearch, RESOURCE_TYPES } from '../hooks/useResourceCompass';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Search, Filter, Map } from 'lucide-react';

export function ResourceCompassWidget({ onResourceSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  
  // Use search when query exists, otherwise discover all
  const { data: resources, isLoading, error } = searchQuery.length > 2
    ? useResourceSearch(searchQuery)
    : useResourceDiscovery({ type: typeFilter });

  const handleResourceClick = (resource) => {
    if (onResourceSelect) {
      onResourceSelect(resource);
    }
  };

  const typeColors = {
    entity: 'bg-blue-100 text-blue-800',
    function: 'bg-green-100 text-green-800',
    workflow: 'bg-purple-100 text-purple-800',
    agent: 'bg-orange-100 text-orange-800',
    page: 'bg-pink-100 text-pink-800',
    component: 'bg-cyan-100 text-cyan-800'
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Resource Compass
        </CardTitle>
        <CardDescription>
          Discover and navigate system resources
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search bar */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Type filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={typeFilter === null ? 'default' : 'outline'}
            onClick={() => setTypeFilter(null)}
          >
            All
          </Button>
          {Object.values(RESOURCE_TYPES).slice(0, 6).map(type => (
            <Button
              key={type}
              size="sm"
              variant={typeFilter === type ? 'default' : 'outline'}
              onClick={() => setTypeFilter(type)}
            >
              {type}
            </Button>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-2">
          {isLoading && (
            <div className="text-center py-8 text-gray-500">
              Discovering resources...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              Failed to load resources: {error.message}
            </div>
          )}

          {resources && resources.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No resources found
            </div>
          )}

          {resources && resources.map(resource => (
            <div
              key={`${resource.type}-${resource.id}`}
              onClick={() => handleResourceClick(resource)}
              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm">{resource.name}</h3>
                    <Badge className={typeColors[resource.type] || 'bg-gray-100 text-gray-800'}>
                      {resource.type}
                    </Badge>
                  </div>
                  {resource.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ResourceCompassWidget;
