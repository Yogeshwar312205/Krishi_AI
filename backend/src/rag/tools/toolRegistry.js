const marketTool = require('./marketTool');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerTool(marketTool);
  }

  registerTool(toolInstance) {
    if (toolInstance && toolInstance.name) {
      this.tools.set(toolInstance.name, toolInstance);
    }
  }

  getTool(name) {
    return this.tools.get(name);
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description
    }));
  }
}

module.exports = new ToolRegistry();
