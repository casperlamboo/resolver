import parsimmon from "parsimmon";
import * as AST from "./abstract_syntax_tree";

/**
 * Parse a number.
 * 
 * @example
 * ```
 * number_parser.tryParse("1") // => new AST.Number(1)
 * number_parser.tryParse("1.0") // => new AST.Number(1.0)
 * ```
 */
const number_parser: parsimmon.Parser<AST.Number> = parsimmon
    .regexp(/([0-9]+\.[0-9]+)|([0-9]*\.[0-9]+)|([0-9]+\.[0-9]*)|([0-9]+)/)
    .map(str => new AST.Number(parseFloat(str)))
    .desc("number");

/**
 * Parse a boolean.
 * 
 * @example
 * ```
 * bool_parser.tryParse("True") // => new AST.Boolean(true)
 * bool_parser.tryParse("False") // => new AST.Boolean(false)
 * ```
 */
const true_parser: parsimmon.Parser<AST.Boolean> = parsimmon
    .string("True")
    .result(new AST.Boolean(true));
const false_parser: parsimmon.Parser<AST.Boolean> = parsimmon
    .string("False")
    .result(new AST.Boolean(false));
const bool_parser: parsimmon.Parser<AST.Boolean> = parsimmon
    .alt(true_parser, false_parser)
    .desc("boolean");

/**
 * Parse a variable name.
 * 
 * @example
 * ```
 * variable_name_regex.test("a") // => new AST.Variable("a")
 * variable_name_regex.test("a.b") // => new AST.Variable("a.b")
 * ```
 */
const variable_name_regex = /[A-Za-z_][A-Za-z0-9_\.]*/;

/**
 * Parse a string.
 * 
 * @example
 * ```
 * string_parser.tryParse("\"hello\"") // => new AST.String("hello")
 * string_parser.tryParse("\'hello\'") // => new AST.String("hello")
 * ```
 */
const string_parser: parsimmon.Parser<AST.String> = parsimmon.alt(
    parsimmon.seq(
        parsimmon.string("\""),
        parsimmon.regexp(/[^"]*/),
        parsimmon.string("\""),
    ),
    parsimmon.seq(
        parsimmon.string("\'"),
        parsimmon.regexp(/[^']*/),
        parsimmon.string("\'"),
    )
).map(([_left, value, _right]) => new AST.String(value)).desc("string");

const variable_parser: parsimmon.Parser<AST.Variable> = parsimmon
    .regexp(variable_name_regex)
    .map(variable_name => new AST.Variable(variable_name))
    .desc("free variable");

/**
 * Parse a parenthesized expression.
 * 
 * @example
 * ```
 * parens_parser.tryParse("(a)") // => new AST.Variable("a")
 * ```
 */
const parens_parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => {
    return parsimmon.seq(
        parsimmon.string("("),
        expression_parser,
        parsimmon.string(")"),
    ).map(([_open_bracked, expression, _close_bracket]) => expression);
}).desc("parenthesized expression");

/**
 * Parse an index expression.
 * 
 * @example
 * ```
 * index_parser.tryParse("a[0]") // => new AST.Index(new AST.Variable("a"), new AST.Number(0))
 * index_parser.tryParse("(a if True else b)[1]") // => new AST.Index(new AST.Condition(new AST.Boolean(true), new AST.Variable("a"), new AST.Variable("b")), new AST.Number(1))
 * ```
 */
const index_parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => {
    return parsimmon.seq(
        variable_parser.or(parens_parser),
        parsimmon.string("["),
        expression_parser.trim(parsimmon.optWhitespace),
        parsimmon.string("]"),
    ).map(([variable, _open_bracked, index_expression, _close_bracket]) => {
        return new AST.Index(variable, index_expression);
    });
}).desc("index expression");

/**
 * Parse a slice expression.
 * 
 * @example
 * ```
 * slice_parser.tryParse("a[0 : 2]") // => new AST.Slice(new AST.Variable("a"), new AST.Number(0), new AST.Number(2))
 * ```
 */
const slice_parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => {
    return parsimmon.seq(
        variable_parser.or(parens_parser),
        parsimmon.string("["),
        expression_parser.trim(parsimmon.optWhitespace),
        parsimmon.string(":"),
        expression_parser.trim(parsimmon.optWhitespace),
        parsimmon.string("]"),
    ).map(([variable, _open_bracked, start_expression, _colon, end_expression, _close_bracket]) => {
        return new AST.Slice(variable, start_expression, end_expression);
    });
}).desc("slice expression");

/**
 * Parse a list expression.
 * 
 * @example
 * ```
 * list_parser.tryParse("[1, 2, 3]") // => new AST.List([new AST.Number(1), new AST.Number(2), new AST.Number(3)])
 * list_parser.tryParse("[True, False]") // => new AST.List([new AST.Boolean(true), new AST.Boolean(false)])
 */
const list_parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => {
    return parsimmon
        .seq(
            parsimmon.string("[").trim(parsimmon.optWhitespace),
            expression_parser
                .sepBy(parsimmon.string(",").trim(parsimmon.optWhitespace))
                .map(elements => new AST.List(elements)),
            parsimmon.string("]").trim(parsimmon.optWhitespace)
        )
        .map(([_bracked_open, elements, _bracked_close]) => elements);
}).desc("list expression");

/**
 * Parse an apply expression.
 * 
 * @example
 * ```
 * apply_parser.tryParse("a(1, 2, 3)") // => new AST.Apply(new AST.Variable("a"), [new AST.Number(1), new AST.Number(2), new AST.Number(3)])
 * apply_parser.tryParse("math.sqrt(9)") // => new AST.Apply(new AST.Variable("math.sqrt"), [new AST.Number(9)])
 * ```
 */
const apply_parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => {
    return parsimmon
        .seq(
            variable_parser.or(parens_parser),
            parsimmon.string("("),
            expression_parser.sepBy(parsimmon.string(",").trim(parsimmon.optWhitespace)).trim(parsimmon.optWhitespace),
            parsimmon.string(")"),
        )
        .map(([fn, _bracked_open, args, _bracked_close]) => new AST.Apply(fn, args));
});

const primary_parser: parsimmon.Parser<AST.Expression> = parsimmon.alt(
    number_parser,
    bool_parser,
    string_parser,
    list_parser,
    apply_parser,
    index_parser,
    slice_parser,
    parens_parser,
    variable_parser,
);

function createOperatorParser<T = AST.IBinaryOperator | AST.IUnaryOperator>(
    operators: { operator_str: string, desc: string, constructor: T }[]
): parsimmon.Parser<T> {
    return parsimmon
        .alt(...operators.map(({ operator_str, constructor, desc }) => {
            return parsimmon
                .string(operator_str)
                .trim(parsimmon.optWhitespace)
                .result(constructor)
                .desc(desc);
        }));
}

/**
 * Parse a unary operator.
 * 
 * @param prev_parser - The previous associativity level parser.
 * @param operator_parser - A parser that parses an operator and returns a constructor for the operator.
 * @returns 
 */
function unaryPreFixParser(
    prev_parser: parsimmon.Parser<AST.Expression>,
    operator_parser: parsimmon.Parser<AST.IUnaryOperator>,
): parsimmon.Parser<AST.Expression> {
    const parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => {
        return parsimmon
            .seq(operator_parser, parser)
            .map(([constructor, expression]) => new constructor(expression))
            .or(prev_parser);
    });
    return parser;
}

/**
 * Parse a left-associative binary operator.
 * 
 * @param prev_parser - The previous associativity level parser.
 * @param operator_parser - A parser that parses an operator and returns a constructor for the operator.
 * @returns A parser that parses a left-associative binary operator.
 */
function leftAssociativeBinaryOperatorParser(
    prev_parser: parsimmon.Parser<AST.Expression>,
    operator_parser: parsimmon.Parser<AST.IBinaryOperator>,
): parsimmon.Parser<AST.Expression> {
    return parsimmon
        .seq(
            prev_parser,
            parsimmon
                .seq(operator_parser, prev_parser)
                .map(([constructor, right_expression]) => ({ constructor, right_expression }))
                .many()
        )
        .map(([first, rest]) => rest.reduce((left_expression, { constructor, right_expression }) => {
            return new constructor(left_expression, right_expression);
        }, first));
}

/**
 * Parse a right-associative binary operator.
 * 
 * @param prev_parser - The previous associativity level parser.
 * @param operator_parser - A parser that parses an operator and returns a constructor for the operator.
 * @returns A parser that parses a right-associative binary operator.
 */
function rightAssociativeBinaryOperatorParser(
    prev_parser: parsimmon.Parser<AST.Expression>,
    operator_parser: parsimmon.Parser<AST.IBinaryOperator>,
): parsimmon.Parser<AST.Expression> {
    const parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => prev_parser.chain((left_expression) => parsimmon
        .seq(operator_parser, parser)
        .map(([constructor, right_expression]) => new constructor(left_expression, right_expression))
        .or(parsimmon.succeed(left_expression))
    ));
    return parser;
}

// based on pythons associativity table: https://www.geeksforgeeks.org/precedence-and-associativity-of-operators-in-python/
const associativity_table = [
    (prev_parser: parsimmon.Parser<AST.Expression>) => rightAssociativeBinaryOperatorParser(prev_parser, createOperatorParser([
        { operator_str: "**", constructor: AST.Exponentiate, desc: "exponentiation" },
    ])),
    (prev_parser: parsimmon.Parser<AST.Expression>) => unaryPreFixParser(prev_parser, createOperatorParser([
        { operator_str: "-", constructor: AST.Negate, desc: "negate" },
    ])),
    (prev_parser: parsimmon.Parser<AST.Expression>) => leftAssociativeBinaryOperatorParser(prev_parser, createOperatorParser([
        { operator_str: "*", constructor: AST.Multiply, desc: "multiplication" },
        { operator_str: "/", constructor: AST.Divide, desc: "division" },
        { operator_str: "%", constructor: AST.Modulo, desc: "modulo" },
    ])),
    (prev_parser: parsimmon.Parser<AST.Expression>) => leftAssociativeBinaryOperatorParser(prev_parser, createOperatorParser([
        { operator_str: "+", constructor: AST.Addition, desc: "addition" },
        { operator_str: "-", constructor: AST.Subtraction, desc: "subtraction" },
    ])),
    (prev_parser: parsimmon.Parser<AST.Expression>) => leftAssociativeBinaryOperatorParser(prev_parser, createOperatorParser([
        { operator_str: "==", constructor: AST.Equality, desc: "equality" },
        { operator_str: "!=", constructor: AST.InEquality, desc: "inequality" },
        { operator_str: "<=", constructor: AST.LessThenEq, desc: "less than or equal to" },
        { operator_str: ">=", constructor: AST.GreaterThenEq, desc: "greater than or equal to" },
        { operator_str: "<", constructor: AST.LessThen, desc: "less than" },
        { operator_str: ">", constructor: AST.GreaterThen, desc: "greater than" },
    ])),
    (prev_parser: parsimmon.Parser<AST.Expression>) => unaryPreFixParser(prev_parser, createOperatorParser([
        { operator_str: "not", constructor: AST.Not, desc: "not" },
    ])),
    (prev_parser: parsimmon.Parser<AST.Expression>) => leftAssociativeBinaryOperatorParser(prev_parser, createOperatorParser([
        { operator_str: "and", constructor: AST.And, desc: "and" },
    ])),
    (prev_parser: parsimmon.Parser<AST.Expression>) => leftAssociativeBinaryOperatorParser(prev_parser, createOperatorParser([
        { operator_str: "or", constructor: AST.Or, desc: "or" },
    ])),
    (prev_parser: parsimmon.Parser<AST.Expression>): parsimmon.Parser<AST.Expression> => {
        const condition_parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => prev_parser.chain((a) => parsimmon
            .seq(
                parsimmon.string("if").trim(parsimmon.optWhitespace),
                prev_parser,
                parsimmon.string("else").trim(parsimmon.optWhitespace),
                condition_parser,
            )
            .map(([_if, condition, _else, b]) => new AST.Condition(condition, a, b))
            .or(parsimmon.succeed(a))
        ));
        return condition_parser;
    },
    (prev_parser: parsimmon.Parser<AST.Expression>) => rightAssociativeBinaryOperatorParser(prev_parser, createOperatorParser([
        { operator_str: ":=", constructor: AST.Assignment, desc: "assignement operator" },
    ])),
];

const expression_parser: parsimmon.Parser<AST.Expression> = parsimmon.lazy(() => {
    return associativity_table.reduce((prev_parser, wrap_associativity_layer) => wrap_associativity_layer(prev_parser), primary_parser);
});

export default expression_parser;
