/**
 * @file A parser for the Papyrus scripting language used in Skyrim Special Edition.
 * @author Hexanode
 * @license GPLv3
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "papyrusSSE",
  extras: () => ["\\\n", /\s/, new RustRegex(";.*?\n")],
  word: ($) => $.identifier,
  conflicts: ($) => [[$.nativeFunction]],
  rules: {
    source_file: ($) => seq($.header, repeat($._statement)),

    header: ($) =>
      seq(
        new RustRegex("(?i)scriptname"),
        $.identifier,
        optional(seq(new RustRegex("(?i)extends"), $.identifier)),
        repeat(choice($.conditional, $.hidden)),
        "\n",
        optional(seq($.docString, "\n")),
      ),
    docString: () => new RustRegex("(?s)[\{][^\}]*?\}"),

    //Statements-------------------------------------------------------
    _statement: ($) =>
      seq(
        choice(
          $.import,
          $.variableDefinition,
          $.functionCall,
          $.assignment,
          $.return,
          $.function,
          $.nativeFunction,
          $.event,
          $.nativeEvent,
        ),
        "\n",
      ),
    import: ($) => seq(new RustRegex("(?i)import"), $.identifier),
    variableDefinition: ($) =>
      seq(
        $.type,
        $.identifier,
        optional(seq("=", $._expression)),
        optional($.conditional),
      ),
    functionCall: ($) => $.callExpression,
    assignment: ($) =>
      choice(
        seq($.lValue, "=", $._expression),
        seq($.lValue, "+=", $._expression),
        seq($.lValue, "-=", $._expression),
        seq($.lValue, "*=", $._expression),
        seq($.lValue, "/=", $._expression),
        seq($.lValue, "%=", $._expression),
      ),
    lValue: ($) =>
      choice(
        seq(optional(seq($.identifier, token.immediate("."))), $.identifier),
        seq(
          $.identifier,
          token.immediate("["),
          $._expression,
          token.immediate("]"),
        ),
      ),
    return: ($) => seq(new RustRegex("(?i)return"), $._expression),
    parameterDefinition: ($) =>
      seq($.type, $.identifier, optional(seq("=", $._term))),
    function: ($) =>
      seq(
        optional($.type),
        new RustRegex("(?i)function"),
        $.identifier,
        "(",
        optional(
          seq($.parameterDefinition, repeat(seq(",", $.parameterDefinition))),
        ),
        ")",
        optional($.global),
        "\n",
        optional(seq($.docString, "\n")),
        repeat1($._statement),
        new RustRegex("(?i)endfunction"),
      ),
    nativeFunction: ($) =>
      seq(
        optional($.type),
        new RustRegex("(?i)function"),
        $.identifier,
        "(",
        optional(
          seq($.parameterDefinition, repeat(seq(",", $.parameterDefinition))),
        ),
        ")",
        $.native,
        optional(seq("\n", $.docString)),
      ),
    event: ($) =>
      seq(
        new RustRegex("(?i)event"),
        $.identifier,
        "(",
        optional(
          seq($.parameterDefinition, repeat(seq(",", $.parameterDefinition))),
        ),
        ")",
        "\n",
        repeat1($._statement),
        new RustRegex("(?i)endevent"),
      ),
    nativeEvent: ($) =>
      seq(
        new RustRegex("(?i)event"),
        $.identifier,
        "(",
        optional(
          seq($.parameterDefinition, repeat(seq(",", $.parameterDefinition))),
        ),
        ")",
        $.native,
      ),
    //-----------------------------------------------------------------

    //Expressions------------------------------------------------------
    _expression: ($) =>
      choice(
        $._term,
        $.callExpression,
        $.arrayExpression,
        $.parenthesis,
        $.arrayCreationExpression,
        $.dotExpression,
        $.castExpression,
        $.unaryExpression,
        $.binaryExpression,
      ),
    parameter: ($) => seq(optional(seq($.identifier, "=")), $._expression),
    _term: ($) =>
      choice($.bool, $.int, $.float, $.none, $.string, $.identifier),
    callExpression: ($) =>
      prec(
        14,
        seq(
          $.identifier,
          "(",
          optional(seq($.parameter, repeat(seq(",", $.parameter)))),
          ")",
        ),
      ),
    arrayExpression: ($) =>
      prec(
        13,
        seq(
          choice($.callExpression, $.identifier),
          token.immediate("["),
          $._expression,
          token.immediate("]"),
        ),
      ),
    parenthesis: ($) => prec(12, seq("(", $._expression, ")")),
    arrayCreationExpression: ($) =>
      prec(
        11,
        seq(
          new RustRegex("(?i)new"),
          $.type,
          token.immediate("["),
          $.int,
          token.immediate("]"),
        ),
      ),
    dotExpression: ($) =>
      prec(10, seq($._expression, ".", choice($.callExpression, $.identifier))),
    castExpression: ($) => prec(9, seq($._expression, "as", $.type)),
    unaryExpression: ($) => prec(8, seq(choice("!", "-"), $._expression)),
    binaryExpression: ($) =>
      choice(
        prec.left(7, seq($._expression, "*", $._expression)),
        prec.left(6, seq($._expression, "/", $._expression)),
        prec.left(5, seq($._expression, "%", $._expression)),
        prec.left(4, seq($._expression, "+", $._expression)),
        prec.left(3, seq($._expression, "-", $._expression)),
        prec.left(2, seq($._expression, $._cmp, $._expression)),
        prec.left(1, seq($._expression, "&&", $._expression)),
        prec.left(0, seq($._expression, "||", $._expression)),
      ),
    //-----------------------------------------------------------------

    //Operators--------------------------------------------------------
    _cmp: () => choice("==", "!=", ">", "<", ">=", "<="),
    //-----------------------------------------------------------------

    //Types------------------------------------------------------------
    type: ($) =>
      choice(
        token(seq(new RustRegex("(?i)bool"), token.immediate("[]"))),
        new RustRegex("(?i)bool"),
        token(seq(new RustRegex("(?i)float"), token.immediate("[]"))),
        new RustRegex("(?i)float"),
        token(seq(new RustRegex("(?i)int"), token.immediate("[]"))),
        new RustRegex("(?i)int"),
        token(seq(new RustRegex("(?i)string"), token.immediate("[]"))),
        new RustRegex("(?i)string"),
        seq($.identifier, "[]"),
        $.identifier,
      ),
    bool: () => choice(new RustRegex("(?i)true"), new RustRegex("(?i)false")),
    int: () =>
      choice(new RustRegex("-?[0-9]+"), new RustRegex("(?i)(0x)[0-9a-f]+")),
    float: () => new RustRegex("-?[0-9]+\.[0-9]+"),
    string: () => new RustRegex('\"([^\n\t"]*?)\"'),
    none: () => new RustRegex("(?i)none"),
    identifier: () => new RustRegex("(?i)[a-z_][a-z0-9_]*"),
    //-----------------------------------------------------------------

    //Flag groups------------------------------------------------------
    _propertyFlags: ($) =>
      choice($.auto, $.autoreadonly, $.hidden, $.conditional),
    //-----------------------------------------------------------------

    //Flags------------------------------------------------------------
    conditional: () => new RustRegex("(?i)conditional"),
    hidden: () => new RustRegex("(?i)hidden"),
    auto: () => new RustRegex("(?i)auto"),
    autoreadonly: () => new RustRegex("(?i)autoreadonly"),
    native: () => new RustRegex("(?i)native"),
    global: () => new RustRegex("(?i)global"),
    //-----------------------------------------------------------------
  },
});
