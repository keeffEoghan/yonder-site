export const sum = (n) => ((n > 1)? n+sum(n-1) : n);

const factorials = [];

export const factorial = (n) =>
    ((factorials[n] === undefined)?
        factorials[n] = ((n > 1)? n*factorial(n-1) : 1)
    :   factorials[n]);

export const combine = (n, r) => factorial(n)/(factorial(r)*factorial(n-r));
export const nCr = combine;
