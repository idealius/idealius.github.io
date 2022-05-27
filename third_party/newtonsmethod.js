
//Original code from https://gist.github.com/TragicSolitude/796f2a1725e9abf13638
var prevGuess = 0;
var _recursions = 0;

// function f(x) {
//     return Math.sin(x);
// }


function derivative(fun, gen_curve, prec) {
    var h = prec;
    return function(x) { return (fun(x + h, gen_curve) - fun(x - h, gen_curve)) / (2 * h); };
}

//Recursive function
function newtonsMethod(func, gen_curve, prec, guess, limit, restart) {
    if (restart) {
        prevGuess = 0;
        _recursions = 0;
    }
    if (guess === null || guess === undefined)
        guess = prec;

    if (Math.abs(prevGuess - guess) > prec) {
        prevGuess = guess;
        var approx = guess - (func(guess, gen_curve) / derivative(func, gen_curve, prec)(guess));
        if (_recursions > limit) return undefined;
        // console.log(guess);
        // // console.log(f(guess));
        // // console.log(derivative(f)(guess));
        // // console.log(approx);
        // console.log('\n');
        _recursions ++;

        return newtonsMethod(func, gen_curve, prec, approx, limit);
    } else {
        return guess;
    }
}

console.log(newtonsMethod(3));