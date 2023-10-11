import parser from "./parser";
import * as AST from "./abstract_syntax_tree";
import { test, expect } from "@jest/globals";

const tests: {
    input: string,
    expected_ast: AST.Expression,
    expected_resolve: AST.ExpressionResult,
    environment?: AST.Environment,
}[] = [
        {
            input: "True",
            expected_ast: new AST.Boolean(true),
            expected_resolve: true,
        },
        {
            input: "False",
            expected_ast: new AST.Boolean(false),
            expected_resolve: false,
        },
        {
            input: "True == True",
            expected_ast: new AST.Equality(new AST.Boolean(true), new AST.Boolean(true)),
            expected_resolve: true,
        },
        {
            input: "True == False",
            expected_ast: new AST.Equality(new AST.Boolean(true), new AST.Boolean(false)),
            expected_resolve: false,
        },
        {
            input: "False == False",
            expected_ast: new AST.Equality(new AST.Boolean(false), new AST.Boolean(false)),
            expected_resolve: true,
        },
        {
            input: "False == True",
            expected_ast: new AST.Equality(new AST.Boolean(false), new AST.Boolean(true)),
            expected_resolve: false,
        },
        {
            input: "False == True",
            expected_ast: new AST.Equality(new AST.Boolean(false), new AST.Boolean(true)),
            expected_resolve: false,
        },
        {
            input: "True == True and False == False",
            expected_ast: new AST.And(
                new AST.Equality(new AST.Boolean(true), new AST.Boolean(true)),
                new AST.Equality(new AST.Boolean(false), new AST.Boolean(false))
            ),
            expected_resolve: true,
        },
        {
            input: "True == True and False == False and 0 == 0",
            expected_ast: new AST.And(
                new AST.And(
                    new AST.Equality(new AST.Boolean(true), new AST.Boolean(true)),
                    new AST.Equality(new AST.Boolean(false), new AST.Boolean(false))
                ),
                new AST.Equality(new AST.Number(0), new AST.Number(0)
                )
            ),
            expected_resolve: true
        },
        {
            input: "1 + 2 - 3 * 3",
            expected_ast: new AST.Subtraction(new AST.Addition(new AST.Number(1), new AST.Number(2)), new AST.Multiply(new AST.Number(3), new AST.Number(3))),
            expected_resolve: -6,
        },
        {
            input: "1 + (2 - 3) * 3",
            expected_ast: new AST.Addition(
                new AST.Number(1),
                new AST.Multiply(
                    new AST.Subtraction(new AST.Number(2), new AST.Number(3)),
                    new AST.Number(3)
                )
            ),
            expected_resolve: -2,
        },
        {
            input: "TrueandTrue",
            expected_ast: new AST.And(new AST.Boolean(true), new AST.Boolean(true)),
            expected_resolve: true,
        }, // this shouldn't actually parse, but do this properly we need a lexer
        {
            input: "10 * 10 == 100 or True",
            expected_ast: new AST.Or(
                new AST.Equality(new AST.Multiply(new AST.Number(10), new AST.Number(10)), new AST.Number(100)),
                new AST.Boolean(true)
            ),
            expected_resolve: true,
        },
        {
            input: "4 ** 3 ** 2",
            expected_ast: new AST.Exponentiate(new AST.Number(4), new AST.Exponentiate(new AST.Number(3), new AST.Number(2))),
            expected_resolve: 262144,
        },
        {
            input: "1 + 1 * 1 ** 2",
            expected_ast: new AST.Addition(new AST.Number(1), new AST.Multiply(new AST.Number(1), new AST.Exponentiate(new AST.Number(1), new AST.Number(2)))),
            expected_resolve: 2,
        },
        {
            input: "1 if True else 0",
            expected_ast: new AST.Condition(new AST.Boolean(true), new AST.Number(1), new AST.Number(0)),
            expected_resolve: 1,
        },
        {
            input: "a",
            expected_ast: new AST.Variable("a"),
            expected_resolve: true,
            environment: { "a": true },

        },
        {
            input: "a[0]",
            expected_ast: new AST.Index(new AST.Variable("a"), new AST.Number(0)),
            expected_resolve: 1,
            environment: { "a": [1, 2, 3] },
        },
        {
            input: "1 if False else 2 if True else 3",
            expected_ast: new AST.Condition(new AST.Boolean(false), new AST.Number(1), new AST.Condition(new AST.Boolean(true), new AST.Number(2), new AST.Number(3))),
            expected_resolve: 2,
        },
        {
            input: "(a if True else b)[1]",
            expected_ast: new AST.Index(new AST.Condition(new AST.Boolean(true), new AST.Variable("a"), new AST.Variable("b")), new AST.Number(1)),
            expected_resolve: 2,
            environment: { "a": [1, 2, 3], "b": [4, 5, 6] },
        },
        {
            input: "a[0 : 2]",
            expected_ast: new AST.Slice(new AST.Variable("a"), new AST.Number(0), new AST.Number(2)),
            expected_resolve: [1, 2],
            environment: { "a": [1, 2, 3] },
        },
        {
            input: "[1, 2, 3]",
            expected_ast: new AST.List([new AST.Number(1), new AST.Number(2), new AST.Number(3)]),
            expected_resolve: [1, 2, 3],
            environment: { "a": [1, 2, 3] },
        },
        {
            input: "[True, False, True]",
            expected_ast: new AST.List([new AST.Boolean(true), new AST.Boolean(false), new AST.Boolean(true)]),
            expected_resolve: [true, false, true],
        },
        {
            input: "([1, 2 + 2])[1]",
            expected_ast: new AST.Index(new AST.List([new AST.Number(1), new AST.Addition(new AST.Number(2), new AST.Number(2))]), new AST.Number(1)),
            expected_resolve: 4,
        },
        {
            input: "not True",
            expected_ast: new AST.Not(new AST.Boolean(true)),
            expected_resolve: false,
        },
        {
            input: "not (True or False)",
            expected_ast: new AST.Not(new AST.Or(new AST.Boolean(true), new AST.Boolean(false))),
            expected_resolve: false,
        },
        {
            input: "math.sqrt(9)",
            expected_ast: new AST.Apply(new AST.Variable("math.sqrt"), [new AST.Number(9)]),
            expected_resolve: 3,
            environment: { "math.sqrt": Math.sqrt },
        },
        {
            input: "(x := 1) + x",
            expected_ast: new AST.Addition(new AST.Assignment(new AST.Variable("x"), new AST.Number(1)), new AST.Variable("x")),
            expected_resolve: 2,
        },
    ];

tests.forEach(({ input, expected_ast, expected_resolve, environment = {} }) => {
    test(`parser.tryParse("${input}")`, () => {
        const parsed_ast = parser.tryParse(input);
        expect(parsed_ast).toEqual(expected_ast);
        expect(parsed_ast.resolve(environment)).toEqual(expected_resolve);
    });
});
