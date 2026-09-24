/**
 * Workforce Activator Initialization Function
 * Validates agent readiness and initializes the workforce activator system
 */

export default async function workforceActivatorInit(params, context) {
  const { validate_agents = true, required_agent_count = 55 } = params;
  
  try {
    console.log('[Workforce Activator] Initializing workforce activation system...');
    
    // Load workforce activator configuration
    const activatorConfig = await context.base44.getFile('agents/workforce-activator.json');
    const config = JSON.parse(activatorConfig);
    
    // Validate agent count
    const agentCount = config.agents.length;
    if (agentCount !== required_agent_count) {
      throw new Error(`Expected ${required_agent_count} agents, found ${agentCount}`);
    }
    
    // Validate agent readiness
    if (validate_agents) {
      const activeAgents = config.agents.filter(agent => agent.status === 'active');
      if (activeAgents.length !== required_agent_count) {
        throw new Error(`Only ${activeAgents.length}/${required_agent_count} agents are active`);
      }
    }
    
    // Initialize task queues
    const queueStats = {};
    for (const [queueName, queueConfig] of Object.entries(config.task_queues)) {
      queueStats[queueName] = {
        max_size: queueConfig.max_queue_size,
        current_size: 0,
        agent_types: queueConfig.agent_types
      };
    }
    
    console.log('[Workforce Activator] Initialization complete', {
      total_agents: agentCount,
      active_agents: config.agents.filter(a => a.status === 'active').length,
      queue_count: Object.keys(config.task_queues).length
    });
    
    return {
      success: true,
      agent_count: agentCount,
      active_agents: config.agents.filter(a => a.status === 'active').length,
      queues: queueStats,
      config: config
    };
    
  } catch (error) {
    console.error('[Workforce Activator] Initialization failed:', error.message);
    throw error;
  }
}
