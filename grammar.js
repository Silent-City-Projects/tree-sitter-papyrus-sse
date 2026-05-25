/**
 * @file A parser for the Papyrus scripting language used in Skyrim Special Edition.
 * @author Hexanode
 * @license GPLv3
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "papyrusSSE",
  extras: () => ["\\\n", /\s/],
  word: ($) => $.identifier,
  rules: {
    // TODO: add the actual grammar rules
    source_file: ($) => seq($.header, repeat($._statement)),

    header: ($) =>
      seq(
        new RustRegex("(?i)scriptname"),
        $.identifier,
        optional(seq(new RustRegex("(?i)extends"), $.identifier)),
        optional(repeat($._scriptFlags)),
        $._terminator,
        optional(seq($.docString, $._terminator)),
      ),

    _terminator: () => "\n",
    docString: () => token(new RustRegex("(?s)[\{].*?\}")),
    _term: ($) =>
      choice($.bool, $.int, $.float, $.none, $.string, $.identifier),
    parameter: ($) =>
      seq(optional(seq($.identifier, $.pureAssignment)), $._expression),

    //Statements-------------------------------------------------------
    _statement: ($) =>
      seq(
        choice($.import, $.variableDefinition, $.functionCall),
        $._terminator,
      ),
    import: ($) => seq(new RustRegex("(?i)import"), $.identifier),
    variableDefinition: ($) =>
      seq($.type, $.identifier, optional(seq($.pureAssignment, $._expression))),
    functionCall: ($) => $.callExpression,
    //-----------------------------------------------------------------

    //Expressions
    _expression: ($) => choice($._term, $.callExpression, $.dotExpression),

    dotExpression: ($) =>
      seq($._expression, ".", choice($.callExpression, $.length)),

    callExpression: ($) =>
      seq(
        $.identifier,
        "(",
        optional(seq($.parameter, optional(repeat(seq(",", $.parameter))))),
        ")",
      ),

    //-----------------------------------------------------------------

    //Operators--------------------------------------------------------
    pureAssignment: () => "=",
    //-----------------------------------------------------------------

    //Types------------------------------------------------------------
    type: ($) => choice($._primitiveType, $._arrayType),
    _arrayType: ($) => seq($._primitiveType, "[]"),
    _primitiveType: ($) =>
      choice(
        new RustRegex("(?i)bool"),
        new RustRegex("(?i)float"),
        new RustRegex("(?i)int"),
        new RustRegex("(?i)string"),
        $.identifier,
      ),
    bool: () => choice(new RustRegex("(?i)true"), new RustRegex("(?i)false")),
    int: () =>
      choice(new RustRegex("-?[0-9]+"), new RustRegex("(?i)(0x)[0-9a-f]+")),
    float: () => new RustRegex("-?[0-9]+\.[0-9]+"),
    string: () => new RustRegex('\"(.?+)\"'),
    none: () => new RustRegex("(?i)none"),
    length: () => new RustRegex("(?i)length"),
    identifier: () => new RustRegex("(?i)[a-z_][a-z0-9_]*"),
    //-----------------------------------------------------------------

    //Flag groups------------------------------------------------------
    _scriptFlags: ($) => choice($.conditional, $.hidden),
    _variableFlags: ($) => $.conditional,
    //-----------------------------------------------------------------

    //Flags------------------------------------------------------------
    conditional: () => new RustRegex("(?i)conditional"),
    hidden: () => new RustRegex("(?i)hidden"),
    //-----------------------------------------------------------------
  },
});
