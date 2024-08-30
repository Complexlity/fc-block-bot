function generateKey(inputString: string) {
  let hash = 0;
  for (let i = 0; i < inputString.length; i++) {
    const char = inputString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to positive number and take modulo 10^16 to keep it under 17 digits
  const positiveHash = Math.abs(hash) % 1e16;

  // Convert to base 36 (0-9 and a-z) to make it shorter
  return positiveHash.toString(36);
}

// Example usage:
const input = "Hello, this is a test string!";
const key = generateKey(input);
console.log(key);
