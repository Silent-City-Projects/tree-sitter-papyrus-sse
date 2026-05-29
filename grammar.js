/**
 * @file A parser for the Papyrus scripting language used in Skyrim Special Edition.
 * @author Hexanode
 * @license GPLv3
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "papyrus_sse",
  extras: ($) => ["\\\n", "\\\r\n", /[ \t]/, $.comment],
  word: ($) => $.identifier,
  conflicts: ($) => [
    [$.nativeFunction],
    [$.nativeEvent],
    [$.property, $.propertyFull],
  ],
  supertypes: ($) => [$.expression, $.term, $.statement],
  rules: {
    source_file: ($) => seq($.header, repeat(seq(optional($.statement), "\n"))),

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
    comment: () =>
      token(choice(seq(";", /.*/), seq(";*", /[^*]*\*+([^/*][^*]*\*+)*/, ";"))),

    //Keywords---------------------------------------------------------
    startIf: () => new RustRegex("(?i)if"),
    elseIf: () => new RustRegex("(?i)elseif"),
    else: () => new RustRegex("(?i)else"),
    endIf: () => new RustRegex("(?i)endif"),
    startWhile: () => new RustRegex("(?i)while"),
    endWhile: () => new RustRegex("(?i)endwhile"),
    startState: () => new RustRegex("(?i)state"),
    endState: () => new RustRegex("(?i)endstate"),
    startFunction: () => new RustRegex("(?i)function"),
    endFunction: () => new RustRegex("(?i)endfunction"),
    startEvent: () => new RustRegex("(?i)event"),
    endEvent: () => new RustRegex("(?i)endevent"),
    startProperty: () => new RustRegex("(?i)property"),
    endProperty: () => new RustRegex("(?i)endproperty"),

    conditional: () => new RustRegex("(?i)conditional"),
    hidden: () => new RustRegex("(?i)hidden"),
    auto: () => new RustRegex("(?i)auto"),
    autoReadOnly: () => new RustRegex("(?i)autoreadonly"),
    native: () => new RustRegex("(?i)native"),
    global: () => new RustRegex("(?i)global"),
    //-----------------------------------------------------------------

    //Statements-------------------------------------------------------
    statement: ($) =>
      seq(
        choice(
          $.if,
          $.while,
          $.import,
          $.variableDefinition,
          $.functionCall,
          $.assignment,
          $.return,
          $.function,
          $.nativeFunction,
          $.event,
          $.nativeEvent,
          $.state,
          $.property,
          $.propertyFull,
        ),
      ),
    if: ($) =>
      seq(
        $.startIf,
        $.expression,
        "\n",
        repeat(seq(optional($.statement), "\n")),
        repeat(
          seq(
            $.elseIf,
            $.expression,
            "\n",
            repeat(seq(optional($.statement), "\n")),
          ),
        ),
        optional(seq($.else, "\n", repeat(seq(optional($.statement), "\n")))),
        $.endIf,
      ),
    while: ($) =>
      seq(
        $.startWhile,
        $.expression,
        "\n",
        repeat(seq(optional($.statement), "\n")),
        $.endWhile,
      ),
    import: ($) => seq(new RustRegex("(?i)import"), $.identifier),
    variableDefinition: ($) =>
      seq(
        $.type,
        $.identifier,
        optional(seq("=", $.expression)),
        optional($.conditional),
      ),
    functionCall: ($) => choice($.callExpression, $.dotExpression),
    assignment: ($) =>
      choice(
        seq($.lValue, field("assignmentOperator", "="), $.expression),
        seq($.lValue, field("assignmentOperator", "+="), $.expression),
        seq($.lValue, field("assignmentOperator", "-="), $.expression),
        seq($.lValue, field("assignmentOperator", "*="), $.expression),
        seq($.lValue, field("assignmentOperator", "/="), $.expression),
        seq($.lValue, field("assignmentOperator", "%="), $.expression),
      ),
    lValue: ($) =>
      choice(
        seq(optional(seq($.identifier, token.immediate("."))), $.identifier),
        seq(
          $.identifier,
          token.immediate("["),
          $.expression,
          token.immediate("]"),
        ),
      ),
    return: ($) => seq(new RustRegex("(?i)return"), optional($.expression)),
    parameterDefinition: ($) =>
      seq($.type, $.identifier, optional(seq("=", $.term))),
    function: ($) =>
      seq(
        optional($.type),
        $.startFunction,
        $.identifier,
        "(",
        optional(
          seq($.parameterDefinition, repeat(seq(",", $.parameterDefinition))),
        ),
        ")",
        optional($.global),
        "\n",
        optional(seq($.docString, "\n")),
        repeat(seq(optional($.statement), "\n")),
        $.endFunction,
      ),
    nativeFunction: ($) =>
      seq(
        optional($.type),
        $.startFunction,
        $.identifier,
        "(",
        optional(
          seq($.parameterDefinition, repeat(seq(",", $.parameterDefinition))),
        ),
        ")",
        choice(
          seq(optional($.global), $.native),
          seq($.native, optional($.global)),
        ),
        optional(seq("\n", $.docString)),
      ),
    event: ($) =>
      seq(
        $.startEvent,
        $.identifier,
        "(",
        optional(
          seq($.parameterDefinition, repeat(seq(",", $.parameterDefinition))),
        ),
        ")",
        "\n",
        optional(seq($.docString, "\n")),
        repeat(seq(optional($.statement), "\n")),
        $.endEvent,
      ),
    nativeEvent: ($) =>
      seq(
        $.startEvent,
        $.identifier,
        "(",
        optional(
          seq($.parameterDefinition, repeat(seq(",", $.parameterDefinition))),
        ),
        ")",
        $.native,
        optional(seq("\n", $.docString)),
      ),
    state: ($) =>
      seq(
        optional($.auto),
        $.startState,
        $.identifier,
        "\n",
        repeat(
          choice($.function, $.nativeFunction, $.event, $.nativeEvent, "\n"),
        ),
        "\n",
        $.endState,
      ),
    property: ($) =>
      seq(
        $.type,
        $.startProperty,
        $.identifier,
        optional(seq("=", $.term)),
        repeat(choice($.auto, $.autoReadOnly, $.conditional, $.hidden)),
      ),
    propertyFull: ($) =>
      seq(
        $.type,
        $.startProperty,
        $.identifier,
        optional($.hidden),
        "\n",
        repeat1(seq(optional($.function), "\n")),
        $.endProperty,
      ),
    //-----------------------------------------------------------------

    //Expressions------------------------------------------------------
    expression: ($) =>
      choice(
        $.term,
        $.callExpression,
        $.arrayExpression,
        $.parenthesis,
        $.arrayCreationExpression,
        $.dotExpression,
        $.castExpression,
        $.unaryExpression,
        $.binaryExpression,
      ),
    parameter: ($) => seq(optional(seq($.identifier, "=")), $.expression),
    term: ($) =>
      choice(
        $.bool,
        $.int,
        $.float,
        $.none,
        $.self,
        $.parent,
        $.string,
        $.identifier,
      ),
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
          $.expression,
          token.immediate("]"),
        ),
      ),
    parenthesis: ($) => prec(12, seq("(", $.expression, ")")),
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
      prec(
        10,
        seq(
          choice(
            $.identifier,
            $.arrayExpression,
            $.callExpression,
            $.parenthesis,
          ),
          token.immediate("."),
          choice(
            $.identifier,
            $.arrayExpression,
            $.callExpression,
            $.dotExpression,
            $.parenthesis,
          ),
        ),
      ),
    castExpression: ($) => prec(9, seq($.expression, "as", $.type)),
    unaryExpression: ($) =>
      prec(8, seq(field("operator", choice("!", "-")), $.expression)),
    binaryExpression: ($) =>
      choice(
        prec.left(7, seq($.expression, field("operator", "*"), $.expression)),
        prec.left(6, seq($.expression, field("operator", "/"), $.expression)),
        prec.left(5, seq($.expression, field("operator", "%"), $.expression)),
        prec.left(4, seq($.expression, field("operator", "+"), $.expression)),
        prec.left(3, seq($.expression, field("operator", "-"), $.expression)),
        prec.left(
          2,
          seq(
            $.expression,
            field("operator", choice("==", "!=", ">", "<", ">=", "<=")),
            $.expression,
          ),
        ),
        prec.left(1, seq($.expression, field("operator", "&&"), $.expression)),
        prec.left(0, seq($.expression, field("operator", "||"), $.expression)),
      ),
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
        seq($.identifier, token.immediate("[]")),
        $.identifier,
      ),
    bool: () => choice(new RustRegex("(?i)true"), new RustRegex("(?i)false")),
    int: () =>
      choice(new RustRegex("-?[0-9]+"), new RustRegex("(?i)(0x)[0-9a-f]+")),
    float: () => new RustRegex("-?[0-9]+\.[0-9]+"),
    string: () => new RustRegex('\"([^\n\t"]*?)\"'),
    none: () => new RustRegex("(?i)none"),
    self: () => new RustRegex("(?i)self"),
    parent: () => new RustRegex("(?i)parent"),
    identifier: () => new RustRegex("(?i)[a-z_][a-z0-9_]*"),
    //-----------------------------------------------------------------
  },
});
