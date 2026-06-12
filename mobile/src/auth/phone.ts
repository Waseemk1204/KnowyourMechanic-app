export function normalizeIndianPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function formatIndianPhone(input: string) {
  return normalizeIndianPhone(input);
}

export function isValidIndianPhone(input: string) {
  return normalizeIndianPhone(input).length === 10;
}
