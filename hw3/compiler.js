var antlr4 = require('antlr4/index');
var HandlebarsLexer = require('HandlebarsLexer').HandlebarsLexer;
var HandlebarsParser = require('HandlebarsParser').HandlebarsParser;
var HandlebarsParserListener = require('HandlebarsParserListener').HandlebarsParserListener;

function HandlebarsCompiler() {
    HandlebarsParserListener.call(this);
    this._inputVar = "__$ctx";
    this._outputVar = "__$result";
    this._helpers = { expr: {}, block: {} };
    return this;
}

HandlebarsCompiler.prototype = Object.create(HandlebarsParserListener.prototype);
HandlebarsCompiler.prototype.constructor = HandlebarsCompiler;

HandlebarsCompiler.escape = function (string) {
    return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (c) {
        switch (c) {
            case '"':
            case "'":
            case '\\':
                return '\\' + c;
            case '\n':
                return '\\n';
            case '\r':
                return '\\r';
            case '\u2028':
                return '\\u2028';
            case '\u2029':
                return '\\u2029';
        }
    })
};

HandlebarsCompiler.prototype.registerExprHelper = function(name, helper) {
    this._helpers.expr[name] = helper;
};

HandlebarsCompiler.prototype.registerBlockHelper = function (name, helper) {
    this._helpers.block[name] = helper;
};

HandlebarsCompiler.prototype.compile = function (template) {
    this._bodySource = `var ${this._outputVar} = "";\n`;

    var chars = new antlr4.InputStream(template);
    var lexer = new HandlebarsLexer(chars);
    var tokens = new antlr4.CommonTokenStream(lexer);
    var parser = new HandlebarsParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.document();
    antlr4.tree.ParseTreeWalker.DEFAULT.walk(this, tree);

    this._bodySource += `return ${this._outputVar};\n`;
    return new Function(this._inputVar, this._bodySource);
};

HandlebarsCompiler.prototype.append = function (expr) {
    this._bodySource += `${this._outputVar} += ${expr};\n`
};

HandlebarsCompiler.prototype.exitRawElement = function (ctx) {
    this.append(`"${HandlebarsCompiler.escape(ctx.getText())}"`);
};

exports.HandlebarsCompiler = HandlebarsCompiler;
