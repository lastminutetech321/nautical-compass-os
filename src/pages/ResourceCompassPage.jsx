/**
 * ResourceCompassPage - Full page for resource exploration
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResourceCompassWidget } from '../components/ResourceCompassWidget';
import { useResourceMap, useResourceDependencies, useResourceUsage } from '../hooks/useResourceCompass';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, Network, Info, BarChart3 } from 'lucide-react';

export function ResourceCompassPage() {
  const navigate = useNavigate();
  const [selectedResource, setSelectedResource] = useState(null);
  
  const { data: resourceMap } = useResourceMap();
  const { data: dependencies } = useResourceDependencies(
    selectedResource?.id,
    selectedResource?.type
  );
  const { data: usage } = useResourceUsage(
    selectedResource?.id,
    selectedResource?.type
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold mb-2">Resource Compass</h1>
          <p className="text-gray-600">
            Discover, explore, and understand system resources
          </p>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Resource discovery */}
          <div className="lg:col-span-1">
            <ResourceCompassWidget onResourceSelect={setSelectedResource} />
          </div>

          {/* Right column - Resource details */}
          <div className="lg:col-span-2">
            {!selectedResource ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-gray-500">
                    <Network className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Select a resource to view details</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">
                    <Info className="h-4 w-4 mr-2" />
                    Info
                  </TabsTrigger>
                  <TabsTrigger value="dependencies">
                    <Network className="h-4 w-4 mr-2" />
                    Dependencies
                  </TabsTrigger>
                  <TabsTrigger value="usage">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Usage
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedResource.name}</CardTitle>
                      <Badge className="w-fit">{selectedResource.type}</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedResource.description && (
                          <div>
                            <h3 className="font-medium mb-2">Description</h3>
                            <p className="text-sm text-gray-600">
                              {selectedResource.description}
                            </p>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium mb-2">Category</h3>
                          <Badge variant="outline">{selectedResource.category}</Badge>
                        </div>
                        {selectedResource.path && (
                          <div>
                            <h3 className="font-medium mb-2">Path</h3>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {selectedResource.path}
                            </code>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="dependencies">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dependencies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!dependencies || dependencies.length === 0 ? (
                        <p className="text-sm text-gray-500">No dependencies found</p>
                      ) : (
                        <div className="space-y-2">
                          {dependencies.map((dep, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <div>
                                <p className="font-medium text-sm">{dep.id}</p>
                                <p className="text-xs text-gray-500">{dep.relationship}</p>
                              </div>
                              <Badge variant="outline">{dep.type}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="usage">
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!usage ? (
                        <p className="text-sm text-gray-500">Loading usage data...</p>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium mb-2">Impact Level</h3>
                            <Badge
                              className={{
                                high: 'bg-red-100 text-red-800',
                                medium: 'bg-yellow-100 text-yellow-800',
                                low: 'bg-green-100 text-green-800'
                              }[usage.impact] || 'bg-gray-100 text-gray-800'}
                            >
                              {usage.impact}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="font-medium mb-2">Used By</h3>
                            {usage.usedBy.length === 0 ? (
                              <p className="text-sm text-gray-500">Not used by other resources</p>
                            ) : (
                              <div className="space-y-1">
                                {usage.usedBy.map((user, idx) => (
                                  <div key={idx} className="text-sm p-2 border rounded">
                                    {user.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        {/* Resource map summary */}
        {resourceMap && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{resourceMap.nodes.length}</div>
                  <div className="text-sm text-gray-600">Total Resources</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{resourceMap.edges.length}</div>
                  <div className="text-sm text-gray-600">Connections</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {new Set(resourceMap.nodes.map(n => n.type)).size}
                  </div>
                  <div className="text-sm text-gray-600">Resource Types</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {new Set(resourceMap.nodes.map(n => n.category)).size}
                  </div>
                  <div className="text-sm text-gray-600">Categories</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ResourceCompassPage;
