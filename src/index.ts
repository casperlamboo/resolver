import parser from "./parser";

const inputs = [
    "1",
    "1 if False else 2",
    "1 if False else 2 if False else 3",
    "1 if False else 2 if False else 3 if False else 4",
    "1 if False else 2 if False else 3 if False else 4 if False else 5",
    "1 if False else 2 if False else 3 if False else 4 if False else 5 if False else 6",
    "1 if False else 2 if False else 3 if False else 4 if False else 5 if False else 6 if False else 7",
    "1 if False else 2 if False else 3 if False else 4 if False else 5 if False else 6 if False else 7 if False else 8",
    "1",
    "1 if False else 2",
    "1 if False else (2 if False else 3)",
    "1 if False else (2 if False else (3 if False else 4))",
    "1 if False else (2 if False else (3 if False else (4 if False else 5)))",
    "1 if False else (2 if False else (3 if False else (4 if False else (5 if False else 6))))",
    "1 if False else (2 if False else (3 if False else (4 if False else (5 if False else (6 if False else 7)))))",
    "1 if False else (2 if False else (3 if False else (4 if False else (5 if False else (6 if False else (7 if False else 8))))))",
    "0 if infill_sparse_density == 0 else (infill_line_width * 100) / infill_sparse_density * (2 if infill_pattern == 'grid' else (3 if infill_pattern == 'triangles' or infill_pattern == 'trihexagon' or infill_pattern == 'cubic' or infill_pattern == 'cubicsubdiv' else (2 if infill_pattern == 'tetrahedral' or infill_pattern == 'quarter_cubic' else (1 if infill_pattern == 'cross' or infill_pattern == 'cross_3d' else (1.6 if infill_pattern == 'lightning' else 1)))))",
];

inputs.forEach((input) => {
    try {
        console.log(`Starting parse of input: "${input}"`);
        const t0 = performance.now();
        parser.tryParse(input);
        const t1 = performance.now();
        console.log(`Parsing took ${(t1 - t0) / 1000} seconds.`);
    } catch (e) {
        console.warn("parsing error", e);
    }
});
