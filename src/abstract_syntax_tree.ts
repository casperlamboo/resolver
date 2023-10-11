export type ExpressionResult = number | boolean | string | Function | null | ExpressionResult[];

export type Environment = { [key: string]: ExpressionResult };

export interface Expression {
    /**
     * Resolve the expression using the provided environment. If the expression contains variables
     * that are not in the environment an error will be thrown.
     * 
     * @example
     * ```ts
     * const expression = new Addition(new Number(1), new Variable("a"));
     * const environment = new Map([["a", 2]]);
     * const resolved = expression.resolve(environment); // 3
     * ```
     * 
     * @param environment - A collection of variables that can be used to resolve the expression.
     * 
     * @returns The resolved expression.
     */
    resolve(environment: Environment): ExpressionResult;

    /**
     * Get the free variables in the expression.
     * 
     * @example
     * ```ts
     * const expression = new Addition(new Variable("a"), new Variable("b"));
     * const free_variables = expression.freeVariables(environment); // Set(["a", "b"])
     * ```
     * 
     * @returns A set of free variables.
     */
    freeVariables(environment?: Environment): Set<string>;

    // /**
    //  * Simplify the expression.
    //  * 
    //  * This is used to simplify expressions like `1 + 2` to `3`. This is different from `resolve` 
    //  * because use the provided environment to resolve variables. While `simple` will only simplify
    //  * expressions that can be simplified without an environment.
    //  * 
    //  * @example
    //  * ```ts
    //  * const expression = new Addition(new Number(1), new Number(2));
    //  * const simplified = expression.simplify(); // Number(3)
    //  * ```
    //  * @returns The simplified expression.
    //  */
    // simplify(): Expression;

    /**
     * Get the string representation of the expression. This string is valid javascript code.
     * 
     * @example
     * ```ts
     * const expression = new Addition(new Number(1), new Number(2));
     * const string = expression.toCodeStr(prefix); "new Addition(new Number(1), new Number(2))";
     */
    toCodeStr(prefix?: string): string;
}

export class UnaryOperator implements Expression {
    protected expression: Expression;

    constructor(expression: Expression) {
        this.expression = expression;
    }

    resolve(_environment: Environment): ExpressionResult {
        throw new Error("Method not implemented.");
    }

    freeVariables(environment: Environment): Set<string> {
        return this.expression.freeVariables(environment);
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${this.expression.toCodeStr(prefix)})`;
    }
}

export interface IUnaryOperator {
    new(expression: Expression): UnaryOperator;
}

export class Negate extends UnaryOperator {
    resolve(environment: Environment): number {
        return -(this.expression.resolve(environment) as number);
    }
}

export class Factorial extends UnaryOperator {
    resolve(environment: Environment): number {
        const value = this.expression.resolve(environment) as number;
        if (value < 0) throw new Error(`Factorial of ${value} is not defined`);
        let factorial = 1;
        for (let i = 2; i <= value; i++) {
            factorial *= i;
        }
        return factorial;
    }
}

export class Not extends UnaryOperator {
    resolve(environment: Environment): boolean {
        return !(this.expression.resolve(environment) as boolean);
    }
}

export class BinaryOperator implements Expression {
    protected left_expression: Expression;
    protected right_expression: Expression;

    constructor(left: Expression, right: Expression) {
        this.left_expression = left;
        this.right_expression = right;
    }

    resolve(_environment: Environment): ExpressionResult {
        throw new Error("Method not implemented.");
    }

    freeVariables(environment: Environment): Set<string> {
        const free_variables: Set<string> = new Set();
        this.left_expression.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        this.right_expression.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        return free_variables;
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${this.left_expression.toCodeStr(prefix)}, ${this.right_expression.toCodeStr(prefix)})`;
    }
}

export interface IBinaryOperator {
    new(left: Expression, right: Expression): BinaryOperator;
}

export class And extends BinaryOperator {
    resolve(environment: Environment): boolean {
        return (this.left_expression.resolve(environment) as boolean) && (this.right_expression.resolve(environment) as boolean);
    }
}

export class Assignment extends BinaryOperator {
    resolve(environment: Environment): ExpressionResult {
        if (!(this.left_expression instanceof Variable)) {
            throw new Error(`Left side of assignment must be a variable`);
        }

        const expression_result = this.right_expression.resolve(environment);

        this.left_expression.freeVariables({}).forEach(free_variable => {
            environment[free_variable] = expression_result;
        });

        return expression_result;
    }

    freeVariables(environment: Environment): Set<string> {
        if (!(this.left_expression instanceof Variable)) {
            throw new Error(`Left side of assignment must be a variable`);
        }
        this.left_expression.freeVariables({}).forEach(free_variable => {
            environment[free_variable] = null;
        });

        const free_variables = this.right_expression.freeVariables(environment);

        return free_variables;
    }
}

export class Or extends BinaryOperator {
    resolve(environment: Environment): boolean {
        return (this.left_expression.resolve(environment) as boolean) || (this.right_expression.resolve(environment) as boolean);
    }
}

export class Addition extends BinaryOperator {
    resolve(environment: Environment): number {
        return (this.left_expression.resolve(environment) as number) + (this.right_expression.resolve(environment) as number);
    }
}

export class Subtraction extends BinaryOperator {
    resolve(environment: Environment): number {
        return (this.left_expression.resolve(environment) as number) - (this.right_expression.resolve(environment) as number);
    }
}

export class Equality extends BinaryOperator {
    resolve(environment: Environment): boolean {
        return this.left_expression.resolve(environment) === this.right_expression.resolve(environment);
    }
}

export class InEquality extends BinaryOperator {
    resolve(environment: Environment): boolean {
        return this.left_expression.resolve(environment) === this.right_expression.resolve(environment);
    }
}

export class LessThen extends BinaryOperator {
    resolve(environment: Environment): boolean {
        return (this.left_expression.resolve(environment) as number) < (this.right_expression.resolve(environment) as number);
    }
}

export class GreaterThen extends BinaryOperator {
    resolve(environment: Environment): boolean {
        return (this.left_expression.resolve(environment) as number) > (this.right_expression.resolve(environment) as number);
    }
}

export class LessThenEq extends BinaryOperator {
    resolve(environment: Environment): boolean {
        return (this.left_expression.resolve(environment) as number) <= (this.right_expression.resolve(environment) as number);
    }
}

export class GreaterThenEq extends BinaryOperator {
    resolve(environment: Environment): boolean {
        return (this.left_expression.resolve(environment) as number) >= (this.right_expression.resolve(environment) as number);
    }
}

export class Exponentiate extends BinaryOperator {
    resolve(environment: Environment): number {
        return Math.pow((this.left_expression.resolve(environment) as number), (this.right_expression.resolve(environment) as number));
    }
}

export class Condition implements Expression {
    protected condition: Expression;
    protected a: Expression;
    protected b: Expression;

    constructor(condition: Expression, a: Expression, b: Expression) {
        this.condition = condition;
        this.a = a;
        this.b = b;
    }

    resolve(environment: Environment): ExpressionResult {
        if (this.condition.resolve(environment)) {
            return this.a.resolve(environment);
        } else {
            return this.b.resolve(environment);
        }
    }

    freeVariables(environment: Environment): Set<string> {
        const free_variables: Set<string> = new Set();
        this.condition.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        this.a.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        this.b.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        return free_variables;
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${this.condition.toCodeStr(prefix)}, ${this.a.toCodeStr(prefix)}, ${this.b.toCodeStr(prefix)})`;
    }
}

export class Multiply extends BinaryOperator {
    resolve(environment: Environment): ExpressionResult {
        return (this.left_expression.resolve(environment) as number) * (this.right_expression.resolve(environment) as number);
    }
}

export class Divide extends BinaryOperator {
    resolve(environment: Environment): number {
        return (this.left_expression.resolve(environment) as number) / (this.right_expression.resolve(environment) as number);
    }
}

export class Modulo extends BinaryOperator {
    resolve(environment: Environment): number {
        return (this.left_expression.resolve(environment) as number) % (this.right_expression.resolve(environment) as number);
    }
}

export class Number implements Expression {
    protected number: number;

    constructor(number: number) {
        this.number = number;
    }

    resolve(_environment: Environment): number {
        return this.number;
    }

    freeVariables(_environment: Environment): Set<string> {
        return new Set();
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${JSON.stringify(this.number)})`;
    }
}

export class Boolean implements Expression {
    protected bool: boolean;

    constructor(bool: boolean) {
        this.bool = bool;
    }

    resolve(_environment: Environment): boolean {
        return this.bool;
    }

    freeVariables(_environment: Environment): Set<string> {
        return new Set();
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${JSON.stringify(this.bool)})`;
    }
}

export class Variable implements Expression {
    protected variable: string;

    constructor(variable: string) {
        this.variable = variable;
    }

    resolve(environment: Environment): ExpressionResult {
        const value = environment[this.variable];
        if (typeof value === "undefined") throw new Error(`Variable ${this.variable} not defined`);
        return value;
    }

    freeVariables(environment: Environment): Set<string> {
        return new Set(environment.hasOwnProperty(this.variable) ? [] : [this.variable]);
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${JSON.stringify(this.variable)})`;
    }
}

export class Index implements Expression {
    protected list: Expression;
    protected index: Expression;

    constructor(list: Expression, index: Expression) {
        this.list = list;
        this.index = index;
    }

    resolve(environment: Environment): ExpressionResult {
        const list = this.list.resolve(environment);
        if (!Array.isArray(list)) throw new Error(`Trying to index ${list} which is not an array`);

        const index = this.index.resolve(environment);
        if (typeof index !== "number") throw new Error(`Index ${index} is not a number`);

        return list[index] as ExpressionResult;
    }

    freeVariables(environment: Environment): Set<string> {
        const free_variables: Set<string> = new Set();
        this.list.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        this.index.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        return free_variables;
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${this.list.toCodeStr(prefix)}, ${this.index.toCodeStr(prefix)})`;
    }
}

export class Slice implements Expression {
    protected list: Expression;
    protected from_index: Expression;
    protected to_index: Expression;

    constructor(list: Expression, from_index: Expression, to_index: Expression) {
        this.list = list;
        this.from_index = from_index;
        this.to_index = to_index;
    }

    resolve(environment: Environment): ExpressionResult {
        const list = this.list.resolve(environment);
        if (!Array.isArray(list)) throw new Error(`Trying to index ${list} which is not an array`);

        const from_index = this.from_index.resolve(environment);
        if (typeof from_index !== "number") throw new Error(`From index ${from_index} is not a number`);

        const to_index = this.to_index.resolve(environment);
        if (typeof to_index !== "number") throw new Error(`To index ${to_index} is not a number`);

        return list.slice(from_index, to_index) as ExpressionResult;
    }

    freeVariables(environment: Environment): Set<string> {
        const free_variables: Set<string> = new Set();
        this.list.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        this.from_index.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        this.to_index.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        return free_variables;
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${this.list.toCodeStr(prefix)}, ${this.from_index.toCodeStr(prefix)}, ${this.to_index.toCodeStr(prefix)})`;
    }
}

export class List implements Expression {
    protected list: Expression[];

    constructor(list: Expression[]) {
        this.list = list;
    }

    resolve(environment: Environment): ExpressionResult {
        return this.list.map(element => element.resolve(environment));
    }

    freeVariables(environment: Environment): Set<string> {
        const free_variables: Set<string> = new Set();
        this.list.forEach(element => {
            element.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        });
        return free_variables;
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}([${this.list.map(element => element.toCodeStr(prefix)).join(", ")}])`;
    }
}

export class Apply implements Expression {
    protected fn: Expression;
    protected args: Expression[];

    constructor(fn: Expression, args: Expression[]) {
        this.fn = fn;
        this.args = args;
    }

    resolve(environment: Environment): ExpressionResult {
        const fn = this.fn.resolve(environment);
        if (typeof fn !== "function") throw new Error(`Trying to call ${fn} which is not a function`);
        const args = this.args.map(arg => arg.resolve(environment));
        return (fn as Function)(...args);
    }

    freeVariables(environment: Environment): Set<string> {
        const free_variables: Set<string> = new Set();
        this.fn.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        this.args.forEach(element => {
            element.freeVariables(environment).forEach(free_variable => free_variables.add(free_variable));
        });
        return free_variables;
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${this.fn.toCodeStr(prefix)}, [${this.args.map(arg => arg.toCodeStr(prefix)).join(", ")}])`;
    }
}

export class String implements Expression {
    protected string: string;

    constructor(string: string) {
        this.string = string;
    }

    resolve(_environment: Environment): string {
        return this.string;
    }

    freeVariables(_environment: Environment): Set<string> {
        return new Set();
    }

    toCodeStr(prefix: string = ""): string {
        return `new ${prefix}${prefix === "" ? "" : "."}${this.constructor.name}(${JSON.stringify(this.string)})`;
    }
}
