/**
 * Operator Evaluators for ICP Rule Engine
 * 
 * Implements pure evaluation logic and detailed explanation generators
 * for all required operator categories: Boolean, Numeric, Text, List, Keywords.
 */

import type { ICPCondition } from '../../types/icp';

export interface EvaluationOutcome {
  matched: boolean;
  explanation: string;
}

/**
 * Normalizes values to string for text comparisons
 */
function toText(val: any, caseSensitive: boolean = false): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return caseSensitive ? str : str.toLowerCase();
}

function toArray(val: any): any[] {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter((item) => item !== null && item !== undefined && item !== '');
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [trimmed];
  }
  return [val];
}

/**
 * Parses numeric value safely
 */
function toNumeric(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

export function evaluateCondition(
  actualValue: any,
  condition: ICPCondition
): EvaluationOutcome {
  const { field, operator, value, secondValue, caseSensitive = false } = condition;

  switch (operator) {
    // ==========================================
    // 1. BOOLEAN & EXISTENCE
    // ==========================================
    case 'equals': {
      let isMatch = false;
      if (typeof actualValue === 'boolean' || typeof value === 'boolean') {
        isMatch = Boolean(actualValue) === Boolean(value);
      } else if (typeof actualValue === 'number' && typeof value === 'number') {
        isMatch = actualValue === value;
      } else {
        isMatch = toText(actualValue, caseSensitive) === toText(value, caseSensitive);
      }
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' equals '${value}'`
          : `Field '${field}' (${JSON.stringify(actualValue)}) does not equal '${value}'`,
      };
    }

    case 'not_equals': {
      let isMatch = false;
      if (typeof actualValue === 'boolean' || typeof value === 'boolean') {
        isMatch = Boolean(actualValue) !== Boolean(value);
      } else if (typeof actualValue === 'number' && typeof value === 'number') {
        isMatch = actualValue !== value;
      } else {
        isMatch = toText(actualValue, caseSensitive) !== toText(value, caseSensitive);
      }
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' (${JSON.stringify(actualValue)}) is not equal to '${value}'`
          : `Field '${field}' equals '${value}'`,
      };
    }

    case 'exists': {
      const exists =
        actualValue !== undefined &&
        actualValue !== null &&
        actualValue !== '' &&
        !(Array.isArray(actualValue) && actualValue.length === 0);
      return {
        matched: exists,
        explanation: exists
          ? `Field '${field}' exists (value: ${JSON.stringify(actualValue)})`
          : `Field '${field}' does not exist or is empty`,
      };
    }

    case 'does_not_exist': {
      const notExists =
        actualValue === undefined ||
        actualValue === null ||
        actualValue === '' ||
        (Array.isArray(actualValue) && actualValue.length === 0);
      return {
        matched: notExists,
        explanation: notExists
          ? `Field '${field}' does not exist or is empty`
          : `Field '${field}' exists with value: ${JSON.stringify(actualValue)}`,
      };
    }

    // ==========================================
    // 2. NUMERIC OPERATORS
    // ==========================================
    case 'greater_than': {
      const actualNum = toNumeric(actualValue);
      const expectedNum = toNumeric(value);
      if (actualNum === null || expectedNum === null) {
        return {
          matched: false,
          explanation: `Field '${field}' (${actualValue}) is missing or not a valid number (expected > ${value})`,
        };
      }
      const isMatch = actualNum > expectedNum;
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' (${actualNum}) is greater than ${expectedNum}`
          : `Field '${field}' (${actualNum}) is not greater than ${expectedNum}`,
      };
    }

    case 'greater_than_or_equal': {
      const actualNum = toNumeric(actualValue);
      const expectedNum = toNumeric(value);
      if (actualNum === null || expectedNum === null) {
        return {
          matched: false,
          explanation: `Field '${field}' (${actualValue}) is missing or not a valid number (expected >= ${value})`,
        };
      }
      const isMatch = actualNum >= expectedNum;
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' (${actualNum}) is greater than or equal to ${expectedNum}`
          : `Field '${field}' (${actualNum}) is less than ${expectedNum}`,
      };
    }

    case 'less_than': {
      const actualNum = toNumeric(actualValue);
      const expectedNum = toNumeric(value);
      if (actualNum === null || expectedNum === null) {
        return {
          matched: false,
          explanation: `Field '${field}' (${actualValue}) is missing or not a valid number (expected < ${value})`,
        };
      }
      const isMatch = actualNum < expectedNum;
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' (${actualNum}) is less than ${expectedNum}`
          : `Field '${field}' (${actualNum}) is not less than ${expectedNum}`,
      };
    }

    case 'less_than_or_equal': {
      const actualNum = toNumeric(actualValue);
      const expectedNum = toNumeric(value);
      if (actualNum === null || expectedNum === null) {
        return {
          matched: false,
          explanation: `Field '${field}' (${actualValue}) is missing or not a valid number (expected <= ${value})`,
        };
      }
      const isMatch = actualNum <= expectedNum;
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' (${actualNum}) is less than or equal to ${expectedNum}`
          : `Field '${field}' (${actualNum}) is greater than ${expectedNum}`,
      };
    }

    case 'between': {
      const actualNum = toNumeric(actualValue);
      let min: number | null = null;
      let max: number | null = null;

      if (Array.isArray(value) && value.length >= 2) {
        min = toNumeric(value[0]);
        max = toNumeric(value[1]);
      } else {
        min = toNumeric(value);
        max = toNumeric(secondValue);
      }

      if (actualNum === null || min === null || max === null) {
        return {
          matched: false,
          explanation: `Field '${field}' (${actualValue}) or range [${min}, ${max}] is invalid for 'between'`,
        };
      }

      const isMatch = actualNum >= min && actualNum <= max;
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' (${actualNum}) is between ${min} and ${max}`
          : `Field '${field}' (${actualNum}) is not between ${min} and ${max}`,
      };
    }

    // ==========================================
    // 3. TEXT OPERATORS
    // ==========================================
    case 'contains': {
      if (actualValue === null || actualValue === undefined) {
        return {
          matched: false,
          explanation: `Field '${field}' is empty (expected to contain '${value}')`,
        };
      }
      const searchTarget = toText(value, caseSensitive).trim();
      if (!searchTarget) {
        return {
          matched: false,
          explanation: `Search value for 'contains' on '${field}' is empty`,
        };
      }
      const targetText = toText(actualValue, caseSensitive);
      const isMatch = targetText.includes(searchTarget);
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' contains '${value}'`
          : `Field '${field}' does not contain '${value}'`,
      };
    }

    case 'does_not_contain': {
      if (actualValue === null || actualValue === undefined) {
        return {
          matched: true,
          explanation: `Field '${field}' is empty (does not contain '${value}')`,
        };
      }
      const searchTarget = toText(value, caseSensitive).trim();
      if (!searchTarget) {
        return {
          matched: true,
          explanation: `Search value for 'does_not_contain' on '${field}' is empty`,
        };
      }
      const targetText = toText(actualValue, caseSensitive);
      const isMatch = !targetText.includes(searchTarget);
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' does not contain '${value}'`
          : `Field '${field}' contains '${value}'`,
      };
    }

    case 'exact_match': {
      if (actualValue === null || actualValue === undefined) {
        return {
          matched: false,
          explanation: `Field '${field}' is empty (expected exact match '${value}')`,
        };
      }
      const targetText = toText(actualValue, caseSensitive);
      const expectedText = toText(value, caseSensitive);
      const isMatch = targetText === expectedText;
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' exactly matches '${value}'`
          : `Field '${field}' ('${actualValue}') does not match '${value}'`,
      };
    }

    case 'starts_with': {
      if (actualValue === null || actualValue === undefined) {
        return {
          matched: false,
          explanation: `Field '${field}' is empty (expected to start with '${value}')`,
        };
      }
      const prefix = toText(value, caseSensitive).trim();
      if (!prefix) {
        return {
          matched: false,
          explanation: `Prefix value for 'starts_with' on '${field}' is empty`,
        };
      }
      const targetText = toText(actualValue, caseSensitive);
      const isMatch = targetText.startsWith(prefix);
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' starts with '${value}'`
          : `Field '${field}' does not start with '${value}'`,
      };
    }

    case 'ends_with': {
      if (actualValue === null || actualValue === undefined) {
        return {
          matched: false,
          explanation: `Field '${field}' is empty (expected to end with '${value}')`,
        };
      }
      const suffix = toText(value, caseSensitive).trim();
      if (!suffix) {
        return {
          matched: false,
          explanation: `Suffix value for 'ends_with' on '${field}' is empty`,
        };
      }
      const targetText = toText(actualValue, caseSensitive);
      const isMatch = targetText.endsWith(suffix);
      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' ends with '${value}'`
          : `Field '${field}' does not end with '${value}'`,
      };
    }

    // ==========================================
    // 4. LIST OPERATORS
    // ==========================================
    case 'is_one_of': {
      const allowedList = toArray(value).map((v) => toText(v, caseSensitive));
      if (allowedList.length === 0) {
        return {
          matched: false,
          explanation: `Expected list for 'is_one_of' is empty`,
        };
      }

      let isMatch = false;
      if (Array.isArray(actualValue)) {
        // If actual is an array (e.g. technologies, categories), check if any element matches
        isMatch = actualValue.some((item) =>
          allowedList.includes(toText(item, caseSensitive))
        );
      } else {
        isMatch = allowedList.includes(toText(actualValue, caseSensitive));
      }

      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' (${JSON.stringify(actualValue)}) is one of [${allowedList.join(', ')}]`
          : `Field '${field}' (${JSON.stringify(actualValue)}) is not in [${allowedList.join(', ')}]`,
      };
    }

    case 'is_not_one_of': {
      const forbiddenList = toArray(value).map((v) => toText(v, caseSensitive));
      if (forbiddenList.length === 0) {
        return {
          matched: true,
          explanation: `Forbidden list for 'is_not_one_of' is empty`,
        };
      }

      let isMatch = true;
      if (Array.isArray(actualValue)) {
        isMatch = !actualValue.some((item) =>
          forbiddenList.includes(toText(item, caseSensitive))
        );
      } else {
        isMatch = !forbiddenList.includes(toText(actualValue, caseSensitive));
      }

      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' (${JSON.stringify(actualValue)}) is not one of [${forbiddenList.join(', ')}]`
          : `Field '${field}' (${JSON.stringify(actualValue)}) is in [${forbiddenList.join(', ')}]`,
      };
    }

    // ==========================================
    // 5. KEYWORD OPERATORS
    // ==========================================
    case 'must_contain':
    case 'contains_all': {
      const keywords = toArray(value).map((k) => toText(k, caseSensitive));
      if (keywords.length === 0) {
        return { matched: true, explanation: `No keywords provided to match` };
      }

      const targetText = Array.isArray(actualValue)
        ? actualValue.map((v) => toText(v, caseSensitive)).join(' ')
        : toText(actualValue, caseSensitive);

      const missingKeywords = keywords.filter((kw) => !targetText.includes(kw));
      const isMatch = missingKeywords.length === 0;

      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' contains all required keywords [${keywords.join(', ')}]`
          : `Field '${field}' is missing required keywords: [${missingKeywords.join(', ')}]`,
      };
    }

    case 'must_not_contain': {
      const prohibitedKeywords = toArray(value).map((k) => toText(k, caseSensitive));
      if (prohibitedKeywords.length === 0) {
        return { matched: true, explanation: `No prohibited keywords specified` };
      }

      const targetText = Array.isArray(actualValue)
        ? actualValue.map((v) => toText(v, caseSensitive)).join(' ')
        : toText(actualValue, caseSensitive);

      const foundProhibited = prohibitedKeywords.filter((kw) => targetText.includes(kw));
      const isMatch = foundProhibited.length === 0;

      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' does not contain any prohibited keywords [${prohibitedKeywords.join(', ')}]`
          : `Field '${field}' contains prohibited keywords: [${foundProhibited.join(', ')}]`,
      };
    }

    case 'contains_any': {
      const keywords = toArray(value).map((k) => toText(k, caseSensitive));
      if (keywords.length === 0) {
        return { matched: true, explanation: `No keywords provided` };
      }

      const targetText = Array.isArray(actualValue)
        ? actualValue.map((v) => toText(v, caseSensitive)).join(' ')
        : toText(actualValue, caseSensitive);

      const foundKeywords = keywords.filter((kw) => targetText.includes(kw));
      const isMatch = foundKeywords.length > 0;

      return {
        matched: isMatch,
        explanation: isMatch
          ? `Field '${field}' contains matched keyword(s): [${foundKeywords.join(', ')}]`
          : `Field '${field}' does not contain any of [${keywords.join(', ')}]`,
      };
    }

    default:
      return {
        matched: false,
        explanation: `Unknown or unsupported operator: '${operator}'`,
      };
  }
}
