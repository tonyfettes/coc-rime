function _isAlpha(char: string): number {
  if (char.length != 1) {
    return 0;
  }
  const charCode = char.charCodeAt(0);
  if (charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0)) {
    return 1;
  } else if (charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0)) {
    return -1;
  } else {
    return 0;
  }
}

export function isAlpha(char: string): boolean {
  return (_isAlpha(char) != 0) as boolean;
}

export function isLowerAlpha (char: string): boolean {
  return _isAlpha(char) === -1;
}

export function isUpperAlpha (char: string): boolean {
  return _isAlpha(char) === 1;
}
