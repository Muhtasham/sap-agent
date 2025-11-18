/**
 * Tests for Agent Definitions
 */

import { sapContextAgent } from '../src/agents/context-analyzer';
import { abapCodeGenerator } from '../src/agents/code-generator';
import { testGenerator } from '../src/agents/test-generator';
import { deploymentGuide } from '../src/agents/deployment-guide';
import { quoteEndpointAgent } from '../src/agents/orchestrator';

describe('Agent Definitions', () => {
  describe('sapContextAgent', () => {
    it('should have required agent properties', () => {
      expect(sapContextAgent.description).toContain('SAP');
      expect(sapContextAgent.prompt).toContain('SAP');
      expect(sapContextAgent.prompt).toContain('configuration');
    });

    it('should have correct tools assigned', () => {
      expect(sapContextAgent.tools).toContain('Read');
      expect(sapContextAgent.tools).toContain('Write');
    });

    it('should have model specified', () => {
      expect(sapContextAgent.model).toBe('sonnet');
    });
  });

  describe('abapCodeGenerator', () => {
    it('should have required agent properties', () => {
      expect(abapCodeGenerator.description).toContain('ABAP');
      expect(abapCodeGenerator.prompt).toContain('ABAP');
      expect(abapCodeGenerator.prompt).toContain('code');
    });

    it('should have file tools', () => {
      expect(abapCodeGenerator.tools).toContain('Read');
      expect(abapCodeGenerator.tools).toContain('Write');
    });

    it('should have model specified', () => {
      expect(abapCodeGenerator.model).toBe('sonnet');
    });
  });

  describe('testGenerator', () => {
    it('should have required agent properties', () => {
      expect(testGenerator.description).toContain('test');
      expect(testGenerator.prompt).toContain('test');
      expect(testGenerator.prompt).toContain('unit');
    });

    it('should have file operation tools', () => {
      expect(testGenerator.tools).toContain('Read');
      expect(testGenerator.tools).toContain('Write');
    });

    it('should have model specified', () => {
      expect(testGenerator.model).toBe('sonnet');
    });
  });

  describe('deploymentGuide', () => {
    it('should have required agent properties', () => {
      expect(deploymentGuide.description).toContain('deployment');
      expect(deploymentGuide.prompt).toContain('deployment');
      expect(deploymentGuide.prompt).toContain('documentation');
    });

    it('should have file tools', () => {
      expect(deploymentGuide.tools).toContain('Read');
      expect(deploymentGuide.tools).toContain('Write');
    });

    it('should have model specified', () => {
      expect(deploymentGuide.model).toBe('sonnet');
    });
  });

  describe('quoteEndpointAgent', () => {
    it('should have required agent properties', () => {
      expect(quoteEndpointAgent.description).toContain('quote');
      expect(quoteEndpointAgent.prompt).toContain('orchestrate');
      expect(quoteEndpointAgent.prompt).toContain('generate');
    });

    it('should have Task tool for delegation', () => {
      expect(quoteEndpointAgent.tools).toContain('Task');
    });

    it('should have file operation tools', () => {
      expect(quoteEndpointAgent.tools).toContain('Read');
      expect(quoteEndpointAgent.tools).toContain('Write');
      expect(quoteEndpointAgent.tools).toContain('Edit');
    });

    it('should have model specified', () => {
      expect(quoteEndpointAgent.model).toBe('sonnet');
    });
  });

  describe('All Agents', () => {
    const agents = [
      sapContextAgent,
      abapCodeGenerator,
      testGenerator,
      deploymentGuide,
      quoteEndpointAgent,
    ];

    it('should all have unique descriptions', () => {
      const descriptions = agents.map(a => a.description);
      const uniqueDescriptions = new Set(descriptions);
      expect(uniqueDescriptions.size).toBe(agents.length);
    });

    it('should all have non-empty prompts', () => {
      agents.forEach(agent => {
        expect(agent.prompt).toBeTruthy();
        expect(agent.prompt.length).toBeGreaterThan(50);
      });
    });

    it('should all have at least one tool', () => {
      agents.forEach(agent => {
        expect(agent.tools).toBeDefined();
        expect(agent.tools).toBeDefined();
        expect(agent.tools!.length).toBeGreaterThan(0);
      });
    });

    it('should all have a model specified', () => {
      agents.forEach(agent => {
        expect(agent.model).toBeDefined();
      });
    });

    it('should all have descriptions', () => {
      agents.forEach(agent => {
        expect(agent.description).toBeTruthy();
        expect(agent.description.length).toBeGreaterThan(10);
      });
    });
  });
});
