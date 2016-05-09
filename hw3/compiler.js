var antlr4 = require('antlr4/index');
var HandlebarsLexer = require('HandlebarsLexer').HandlebarsLexer;
var HandlebarsParser = require('HandlebarsParser').HandlebarsParser;
var HandlebarsParserListener = require('HandlebarsParserListener').HandlebarsParserListener;

function HandlebarsCompiler() {
    HandlebarsParserListener.call(this);
    this._inputVar = "__$ctx";
    this._outputVar = "__$result";
    this._helpers = { expr: {}, block: {} };
    this._usedExprHelpers = [];
    return this;
}

HandlebarsCompiler.prototype = Object.create(HandlebarsParserListener.prototype);
HandlebarsCompiler.prototype.constructor = HandlebarsCompiler;

HandlebarsCompiler.prototype.mangleEscape = function(expr) {
    return `__$${expr}`;
};

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

HandlebarsCompiler.prototype.addHelpers = function(){
    for(var i = 0; i < this._usedExprHelpers.length; i++) {
        var funcName = this._usedExprHelpers[i];
        var mangledFuncName = this.mangleEscape(funcName);
        var funcBody = this._helpers.expr[funcName];
        var funcSignatureAndBody = `\nvar ${mangledFuncName} = ${funcBody.toString()}\n`;
        this._bodySource = funcSignatureAndBody + this._bodySource;
    }
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

    this.addHelpers();

    this._bodySource += `return ${this._outputVar};\n`;
    return new Function(this._inputVar, this._bodySource);
};

HandlebarsCompiler.prototype.append = function (expr) {
    this._bodySource += `${this._outputVar} += ${expr};\n`
};

HandlebarsCompiler.prototype.exitRawElement = function (ctx) {
    // Simply grab all the text and output it
    var text = ctx.getText();
    var escapedText = HandlebarsCompiler.escape(text);
    this.append(`"${escapedText}"`);
};

HandlebarsCompiler.prototype.exitDocument = function (ctx) {
    // Simply grab all the text and log it - for debugging purposes
    // console.log(this._bodySource);
};

HandlebarsCompiler.prototype.exitLiteral = function (ctx) {
    // All literals simply copy text
    ctx.source = `${ctx.getText()}`;
};

HandlebarsCompiler.prototype.exitParenthesizedExpression = function (ctx) {
    // All parenthesized expressions depend on the expressions inside of them
    ctx.source = `${ctx.exp.source}`;
};

HandlebarsCompiler.prototype.exitDataLookup = function (ctx) {
    // For datalookup, simply lookup the variable in inputvar
    ctx.source = `${this._inputVar + "." + ctx.variableName.text}`;
};

HandlebarsCompiler.prototype.exitExpression = function (ctx) {
    // Bubble up to expressionElement
    ctx.source = `${ctx.children[0].source}`;
};

HandlebarsCompiler.prototype.exitExpressionElement = function (ctx) {
    // Output this to string
    var src = `${ctx.exp.source}`;
    this.append(src);
};

HandlebarsCompiler.prototype.exitHelperApplication = function (ctx) {
    // Output this to string
    var functionBeingCalled = ctx.funcName.text;
    var mangleEscapedFunctionName = this.mangleEscape(functionBeingCalled);

    // Add to used expr helpers
    this._usedExprHelpers.push(functionBeingCalled);

    // Add function call
    ctx.source = `${mangleEscapedFunctionName}(${this._inputVar}`;
    // Add parameters
    for (var i = 0; i < ctx.args.length; i++) {
        ctx.source += `,${ctx.args[i].source}`;
    }
    // Close parentheses
    ctx.source += ')';
};

exports.HandlebarsCompiler = HandlebarsCompiler;
