/**
 * ABAP syntax validator
 * Performs basic syntax checks on generated ABAP code
 */

import { ValidationResult, SAPVersion } from '../types';

export class ABAPSyntaxValidator {
  /**
   * Validate ABAP code syntax
   */
  static validate(code: string, sapVersion: SAPVersion): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic syntax rules
    this.checkStatementEndings(code, errors);
    this.checkBlockStructure(code, errors);
    this.checkVariableDeclarations(code, errors, warnings);
    this.checkForbiddenSyntax(code, sapVersion, errors, warnings);
    this.checkNamingConventions(code, warnings);
    this.checkTransactionSafety(code, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check that statements end with periods
   */
  private static checkStatementEndings(code: string, errors: string[]): void {
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('*') || line.startsWith('"')) {
        continue;
      }

      // Check for keywords that must end statements
      const keywords = [
        'DATA', 'TABLES', 'WRITE', 'SELECT', 'INSERT', 'UPDATE', 'DELETE',
        'CALL FUNCTION', 'MOVE', 'CLEAR', 'REFRESH', 'APPEND',
        'IF', 'ENDIF', 'ELSE', 'ELSEIF', 'CASE', 'ENDCASE', 'WHEN',
        'DO', 'ENDDO', 'WHILE', 'ENDWHILE', 'LOOP', 'ENDLOOP',
        'FORM', 'ENDFORM', 'PERFORM', 'FUNCTION', 'ENDFUNCTION'
      ];

      for (const keyword of keywords) {
        if (line.toUpperCase().startsWith(keyword)) {
          // Check if next non-comment line is a continuation or new statement
          let j = i + 1;
          while (j < lines.length && (lines[j].trim().startsWith('*') || lines[j].trim().startsWith('"'))) {
            j++;
          }

          if (j < lines.length && !line.endsWith('.') && !line.endsWith(',')) {
            const nextLine = lines[j].trim();
            // If next line doesn't start with continuation, we need a period
            if (!nextLine.startsWith('INTO') && !nextLine.startsWith('FROM') &&
                !nextLine.startsWith('WHERE') && !nextLine.startsWith('AND')) {
              errors.push(`Line ${i + 1}: Statement starting with '${keyword}' should end with period`);
            }
          }
        }
      }
    }
  }

  /**
   * Check balanced BEGIN/END blocks
   */
  private static checkBlockStructure(code: string, errors: string[]): void {
    const stack: Array<{ keyword: string; line: number }> = [];
    const lines = code.split('\n');

    const blockPairs: Record<string, string> = {
      'IF': 'ENDIF',
      'CASE': 'ENDCASE',
      'DO': 'ENDDO',
      'WHILE': 'ENDWHILE',
      'LOOP': 'ENDLOOP',
      'FORM': 'ENDFORM',
      'FUNCTION': 'ENDFUNCTION',
      'METHOD': 'ENDMETHOD',
      'CLASS': 'ENDCLASS',
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      // Skip comments
      if (line.startsWith('*') || line.startsWith('"')) {
        continue;
      }

      // Check for block starts
      for (const [start, end] of Object.entries(blockPairs)) {
        if (line.startsWith(start + ' ') || line === start + '.') {
          stack.push({ keyword: start, line: i + 1 });
        } else if (line.startsWith(end)) {
          if (stack.length === 0) {
            errors.push(`Line ${i + 1}: Unexpected ${end} without matching ${start}`);
          } else {
            const last = stack.pop()!;
            if (blockPairs[last.keyword] !== end) {
              errors.push(`Line ${i + 1}: ${end} doesn't match ${last.keyword} at line ${last.line}`);
            }
          }
        }
      }
    }

    // Check for unclosed blocks
    for (const block of stack) {
      errors.push(`Line ${block.line}: Unclosed ${block.keyword} block`);
    }
  }

  /**
   * Check variable declarations
   */
  private static checkVariableDeclarations(code: string, _errors: string[], warnings: string[]): void {
    const declared = new Set<string>();
    const used = new Set<string>();
    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();

      // Skip comments
      if (trimmed.startsWith('*') || trimmed.startsWith('"')) {
        continue;
      }

      // Extract declared variables
      const dataMatch = trimmed.match(/^DATA:?\s+([A-Z0-9_]+)/);
      if (dataMatch) {
        declared.add(dataMatch[1]);
      }

      // Extract used variables (basic check)
      const varMatches = trimmed.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g);
      for (const match of varMatches) {
        const varName = match[1];
        if (!this.isKeyword(varName)) {
          used.add(varName);
        }
      }
    }

    // Warn about unused variables
    for (const varName of declared) {
      if (!used.has(varName)) {
        warnings.push(`Variable ${varName} is declared but never used`);
      }
    }
  }

  /**
   * Check for forbidden syntax in specific SAP versions
   */
  private static checkForbiddenSyntax(
    code: string,
    sapVersion: SAPVersion,
    _errors: string[],
    warnings: string[]
  ): void {
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      // R/3 specific restrictions
      if (sapVersion === 'R3') {
        if (line.includes('NEW ') || line.includes('CREATE OBJECT')) {
          warnings.push(`Line ${i + 1}: Object-oriented syntax may not be available in R/3`);
        }
      }

      // Check for obsolete statements
      if (line.includes('MOVE-CORRESPONDING')) {
        warnings.push(`Line ${i + 1}: Consider using '=' instead of MOVE-CORRESPONDING for clarity`);
      }

      if (line.includes('OCCURS')) {
        warnings.push(`Line ${i + 1}: OCCURS is obsolete, use standard table type instead`);
      }
    }
  }

  /**
   * Check SAP naming conventions
   */
  private static checkNamingConventions(code: string, warnings: string[]): void {
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Function modules should start with Z_ or Y_
      const funcMatch = line.match(/FUNCTION\s+([A-Z0-9_]+)/i);
      if (funcMatch) {
        const funcName = funcMatch[1].toUpperCase();
        if (!funcName.startsWith('Z_') && !funcName.startsWith('Y_')) {
          warnings.push(`Line ${i + 1}: Custom function should start with Z_ or Y_: ${funcName}`);
        }
      }

      // Classes should start with ZCL_ or YCL_
      const classMatch = line.match(/CLASS\s+([A-Z0-9_]+)/i);
      if (classMatch) {
        const className = classMatch[1].toUpperCase();
        if (!className.startsWith('ZCL_') && !className.startsWith('YCL_')) {
          warnings.push(`Line ${i + 1}: Custom class should start with ZCL_ or YCL_: ${className}`);
        }
      }
    }
  }

  /**
   * Check for transaction safety
   */
  private static checkTransactionSafety(code: string, warnings: string[]): void {
    // Filter out comments to avoid false positives
    const lines = code.split('\n');
    const codeWithoutComments = lines
      .filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('*') && !trimmed.startsWith('"');
      })
      .join('\n');

    const upperCode = codeWithoutComments.toUpperCase();

    const hasInsert = upperCode.includes('INSERT');
    const hasUpdate = upperCode.includes('UPDATE');
    const hasDelete = upperCode.includes('DELETE');
    const hasModify = upperCode.includes('MODIFY');

    const hasCommit = upperCode.includes('COMMIT WORK');
    const hasRollback = upperCode.includes('ROLLBACK WORK');

    if ((hasInsert || hasUpdate || hasDelete || hasModify) && !hasCommit) {
      warnings.push('Database modifications found but no COMMIT WORK statement');
    }

    if ((hasInsert || hasUpdate || hasDelete || hasModify) && !hasRollback) {
      warnings.push('Database modifications found but no error handling with ROLLBACK WORK');
    }
  }

  /**
   * Check if a word is an ABAP keyword
   */
  private static isKeyword(word: string): boolean {
    const keywords = new Set([
      'DATA', 'TYPE', 'LIKE', 'VALUE', 'TABLES', 'SELECT', 'FROM', 'WHERE',
      'INTO', 'APPEND', 'INSERT', 'UPDATE', 'DELETE', 'MODIFY', 'CLEAR',
      'REFRESH', 'IF', 'ELSE', 'ENDIF', 'CASE', 'WHEN', 'ENDCASE', 'DO',
      'ENDDO', 'WHILE', 'ENDWHILE', 'LOOP', 'ENDLOOP', 'EXIT', 'CONTINUE',
      'CHECK', 'WRITE', 'READ', 'CALL', 'FUNCTION', 'ENDFUNCTION', 'FORM',
      'ENDFORM', 'PERFORM', 'RETURN', 'EXPORTING', 'IMPORTING', 'CHANGING',
      'RAISING', 'EXCEPTIONS', 'MESSAGE', 'COMMIT', 'ROLLBACK', 'WORK',
    ]);

    return keywords.has(word);
  }
}
