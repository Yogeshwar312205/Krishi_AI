const marketTool = require('./marketTool');
const userVehicleTool = require('./userVehicleTool');
const userTripsTool = require('./userTripsTool');
const availableVehiclesTool = require('./availableVehiclesTool');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerTool(marketTool);
    this.registerTool(userVehicleTool);
    this.registerTool(userTripsTool);
    this.registerTool(availableVehiclesTool);
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
