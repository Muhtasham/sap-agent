# Contributing to SAP Endpoint Generator

Thank you for your interest in contributing to the SAP Endpoint Generator! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Documentation](#documentation)

## Code of Conduct

This project follows a Code of Conduct that all contributors are expected to adhere to. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- Node.js 18 or later
- Git
- TypeScript knowledge
- Basic understanding of SAP ABAP and OData
- Familiarity with Claude Agent SDK

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/sap-agent.git
   cd sap-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Set up your Anthropic API key**
   ```bash
   export ANTHROPIC_API_KEY='your-api-key'
   ```

## Project Structure

```
sap-agent/
├── src/
│   ├── agents/              # Agent definitions
│   │   ├── orchestrator.ts
│   │   ├── context-analyzer.ts
│   │   ├── code-generator.ts
│   │   ├── test-generator.ts
│   │   └── deployment-guide.ts
│   ├── mcp-server/          # MCP tools
│   │   ├── server.ts
│   │   └── tools/
│   ├── parsers/             # SAP config parsers
│   ├── validators/          # Code validators
│   ├── templates/           # ABAP templates
│   ├── types/               # TypeScript types
│   ├── index.ts             # Main entry point
│   └── cli.ts               # CLI interface
├── examples/                # Example configurations
├── tests/                   # Test suite
└── docs/                    # Additional documentation
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-validator`
- `fix/parser-bug`
- `docs/improve-readme`
- `refactor/simplify-agent-logic`

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(parser): add support for BAPI signature parsing

fix(validator): correct ABAP block structure validation

docs(readme): add troubleshooting section

test(parsers): add tests for custom field extraction
```

### Code Changes

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, readable code
   - Follow existing patterns
   - Add comments for complex logic
   - Update types as needed

3. **Add tests**
   - Unit tests for new functions
   - Integration tests for new features
   - Ensure existing tests still pass

4. **Update documentation**
   - Update README if adding new features
   - Add JSDoc comments to functions
   - Update GETTING_STARTED if changing user workflows

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- parsers.test.ts
```

### Writing Tests

Use Jest for testing:

```typescript
import { DDICParser } from '../src/parsers/ddic-parser';

describe('DDICParser', () => {
  describe('parseTableStructure', () => {
    it('should parse a basic table structure', () => {
      const ddic = `
        Field       Data Type  Length  Description
        VBELN       CHAR       10      Sales Document
      `;

      const result = DDICParser.parseTableStructure('VBAK', ddic);

      expect(result.tableName).toBe('VBAK');
      expect(result.fields.length).toBeGreaterThan(0);
    });
  });
});
```

### Test Coverage Requirements

- Minimum 70% coverage for new code
- 100% coverage for critical paths (parsers, validators)
- Tests should cover edge cases and error scenarios

## Submitting Changes

### Pull Request Process

1. **Ensure your code passes all checks**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

2. **Update documentation**
   - README.md if adding features
   - CHANGELOG.md with your changes
   - JSDoc comments

3. **Create a pull request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Provide context in the description
   - Include screenshots for UI changes

4. **PR Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing performed

   ## Checklist
   - [ ] Code follows project style
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] Tests pass locally
   - [ ] No new warnings
   ```

5. **Address review feedback**
   - Respond to comments
   - Make requested changes
   - Re-request review when ready

## Code Style

### TypeScript Guidelines

1. **Use strict mode**
   ```typescript
   // tsconfig.json has strict: true
   ```

2. **Explicit types**
   ```typescript
   // Good
   function parseTable(name: string, content: string): SAPTable {
     // ...
   }

   // Avoid
   function parseTable(name, content) {
     // ...
   }
   ```

3. **Interfaces over types for objects**
   ```typescript
   // Good
   interface SAPField {
     name: string;
     dataType: string;
   }

   // Also acceptable
   type SAPVersion = 'R3' | 'ECC6' | 'S4HANA';
   ```

4. **Async/await over promises**
   ```typescript
   // Good
   async function fetchData(): Promise<Data> {
     const response = await fetch(url);
     return response.json();
   }

   // Avoid
   function fetchData(): Promise<Data> {
     return fetch(url).then(r => r.json());
   }
   ```

### Formatting

Use the project's ESLint and Prettier configuration:

```bash
# Check formatting
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Naming Conventions

- **Files**: kebab-case (`ddic-parser.ts`)
- **Classes**: PascalCase (`DDICParser`)
- **Functions**: camelCase (`parseTableStructure`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase with 'I' prefix optional (`SAPField`)

## Documentation

### JSDoc Comments

Add JSDoc comments for all exported functions and classes:

```typescript
/**
 * Parse SAP DDIC table structure into structured format
 *
 * @param tableName - Name of the SAP table (e.g., 'VBAK')
 * @param ddicExport - DDIC export text from SE11
 * @returns Parsed table structure with fields and keys
 *
 * @example
 * ```typescript
 * const table = DDICParser.parseTableStructure('VBAK', ddicText);
 * console.log(table.fields.length); // Number of fields
 * ```
 */
export function parseTableStructure(
  tableName: string,
  ddicExport: string
): SAPTable {
  // ...
}
```

### README Updates

When adding features:
1. Add to Features section
2. Update examples
3. Add to Table of Contents
4. Update usage instructions

### Inline Comments

Add comments for complex logic:

```typescript
// Extract field name - handles both standard format and key indicators
// Example: "* MANDT" (key field) or "VBELN" (regular field)
const nameMatch = namePart.match(/^([A-Z][A-Z0-9_]+)/i);
```

## Areas for Contribution

### High Priority

- [ ] Support for additional SAP versions (older R/3, newer S/4HANA features)
- [ ] More ABAP templates (reports, classes, enhancements)
- [ ] Enhanced error recovery in code generation
- [ ] Performance optimization for large SAP configs
- [ ] Web UI for code generation

### Medium Priority

- [ ] Support for additional OData operations (READ, UPDATE, DELETE)
- [ ] BAPI signature parser improvements
- [ ] Custom Z-table generation
- [ ] SAP transport management integration
- [ ] Deployment automation scripts

### Documentation

- [ ] More example SAP configurations
- [ ] Video tutorials
- [ ] Architecture decision records (ADRs)
- [ ] API reference documentation
- [ ] Troubleshooting guides

### Testing

- [ ] E2E tests with real SAP systems
- [ ] Performance benchmarks
- [ ] Stress testing for large configs
- [ ] Integration tests for all MCP tools

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create an issue with the bug template
- **Features**: Create an issue with the feature template
- **Security**: Email security@example.com

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- README.md contributors section
- Release notes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SAP Endpoint Generator! 🚀
