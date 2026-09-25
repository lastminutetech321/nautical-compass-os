import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Compass, 
  TrendingUp, 
  Users, 
  Briefcase, 
  DollarSign,
  Clock,
  Target,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function ResourceCompass() {
  const [activeTab, setActiveTab] = useState('overview');

  // Platform Core dependencies status
  const dependencies = {
    canonInventory: { status: 'operational', count: 33, repos: 5 },
    platformCore: { status: 'partial', modules: ['governance', 'legal', 'operations'] },
    resourceTypes: ['talent', 'capital', 'partnerships', 'infrastructure']
  };

  const resourceCategories = [
    {
      id: 'talent',
      name: 'Talent Resources',
      icon: Users,
      color: 'blue',
      description: 'Human capital and expertise',
      metrics: {
        total: 0,
        active: 0,
        pending: 0
      },
      status: 'pending_canon'
    },
    {
      id: 'capital',
      name: 'Financial Resources',
      icon: DollarSign,
      color: 'green',
      description: 'Funding and financial instruments',
      metrics: {
        total: 0,
        allocated: 0,
        available: 0
      },
      status: 'pending_canon'
    },
    {
      id: 'partnerships',
      name: 'Strategic Partnerships',
      icon: Briefcase,
      color: 'purple',
      description: 'Collaborative relationships and alliances',
      metrics: {
        total: 0,
        active: 0,
        pipeline: 0
      },
      status: 'pending_canon'
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure',
      icon: Target,
      color: 'orange',
      description: 'Technical and operational infrastructure',
      metrics: {
        total: 0,
        operational: 0,
        planned: 0
      },
      status: 'pending_canon'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'pending_canon': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'operational': return 'Operational';
      case 'partial': return 'Partial';
      case 'pending_canon': return 'Pending Canon';
      default: return 'Unknown';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Compass className="h-8 w-8" />
            Resource Compass
          </h1>
          <p className="text-muted-foreground mt-1">
            Strategic resource allocation and management
          </p>
        </div>
        <Button disabled>
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Dependency Status Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Platform Integration Status:</strong> Resource Compass requires NC Canon population and Platform Core dependency resolution. 
          Canon Inventory is operational ({dependencies.canonInventory.count} files across {dependencies.canonInventory.repos} repos). 
          Platform Core modules are in partial state.
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Resource Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resourceCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-${category.color}-500 opacity-10 rounded-bl-full`} />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Icon className={`h-8 w-8 text-${category.color}-500`} />
                      <Badge variant="outline" className={getStatusColor(category.status)}>
                        {getStatusLabel(category.status)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(category.metrics).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common resource management tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button variant="outline" disabled className="justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Add Talent Resource
                </Button>
                <Button variant="outline" disabled className="justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Allocate Capital
                </Button>
                <Button variant="outline" disabled className="justify-start">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Create Partnership
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocation Tab */}
        <TabsContent value="allocation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Allocation</CardTitle>
              <CardDescription>
                Manage resource distribution across initiatives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Allocation engine requires Canon governance rules and Platform Core resource models.
                  Current status: <Badge variant="outline" className="ml-2">Pending Configuration</Badge>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Dependencies</CardTitle>
              <CardDescription>
                Required components for full Resource Compass functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Canon Inventory */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">NC Canon Inventory</p>
                    <p className="text-sm text-muted-foreground">
                      {dependencies.canonInventory.count} files classified across {dependencies.canonInventory.repos} repositories
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-500">Operational</Badge>
              </div>

              {/* Platform Core */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Platform Core Modules</p>
                    <p className="text-sm text-muted-foreground">
                      Governance, Legal, Operations frameworks required
                    </p>
                  </div>
                </div>
                <Badge className="bg-yellow-500">Partial</Badge>
              </div>

              {/* Resource Models */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Resource Type Definitions</p>
                    <p className="text-sm text-muted-foreground">
                      Talent, Capital, Partnership, Infrastructure models
                    </p>
                  </div>
                </div>
                <Badge className="bg-orange-500">Pending Canon</Badge>
              </div>

              {/* Next Steps */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Next Steps</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Complete Canon migration to GitHub (governance + legal)
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Populate Platform Core resource models from Canon
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Enable Resource Compass entity workflows
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Analytics</CardTitle>
              <CardDescription>
                Performance metrics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Analytics engine will activate after Canon population and Platform Core integration.
                  Expected metrics: ROI, utilization rates, allocation efficiency, strategic alignment.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
