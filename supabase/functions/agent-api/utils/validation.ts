export function validateRequired(
  params: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    const val = params[field];
    if (val === undefined || val === null || val === '') {
      return `O campo '${field}' é obrigatório`;
    }
  }
  return null;
}

export function validatePositiveNumber(value: unknown, field: string): string | null {
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return `O campo '${field}' deve ser um número maior que zero`;
  }
  return null;
}

export function validateEnum(value: unknown, allowed: string[], field: string): string | null {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return `O campo '${field}' deve ser um dos valores: ${allowed.join(', ')}`;
  }
  return null;
}

export function validateISODate(value: unknown, field: string): string | null {
  if (typeof value !== 'string') {
    return `O campo '${field}' deve ser uma string no formato YYYY-MM-DD`;
  }
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(value)) {
    return `O campo '${field}' deve estar no formato YYYY-MM-DD`;
  }
  const date = new Date(value + 'T00:00:00Z');
  if (isNaN(date.getTime())) {
    return `O campo '${field}' contém uma data inválida`;
  }
  return null;
}

export function validateUUID(value: unknown, field: string): string | null {
  if (typeof value !== 'string') {
    return `O campo '${field}' deve ser um UUID válido`;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return `O campo '${field}' deve ser um UUID válido`;
  }
  return null;
}

export function validateHexColor(value: unknown, field: string): string | null {
  if (typeof value !== 'string') {
    return `O campo '${field}' deve ser uma cor hex válida (#RRGGBB)`;
  }
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!hexRegex.test(value)) {
    return `O campo '${field}' deve ser uma cor hex válida no formato #RRGGBB`;
  }
  return null;
}

export function validateIntegerRange(
  value: unknown,
  min: number,
  max: number,
  field: string
): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    return `O campo '${field}' deve ser um inteiro entre ${min} e ${max}`;
  }
  return null;
}
