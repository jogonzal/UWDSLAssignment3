var antlr4 = require('antlr4/index');
var HandlebarsLexer = require('HandlebarsLexer').HandlebarsLexer;
var HandlebarsParser = require('HandlebarsParser').HandlebarsParser;
var HandlebarsParserListener = require('HandlebarsParserListener').HandlebarsParserListener;

var foreachFunction = function(ctx, body, lookup){
    // Output the body multiple times
    var appendedResult = "";
    var varArr = lookup;
    for(var i = 0; i< varArr.length; i++){
        appendedResult += body(varArr[i]);
    }
    return appendedResult;
};

var ifFunction = function(ctx, body, lookup){
    // For some reason, in the if block the lookup is already evaluated
    if(lookup){
        return body(ctx);
    }
    return "";
};

var withFunction = function(ctx, body, lookup){
    // Contrary to the if block, in the with block the lookup needs to be looked up in the context
    return body(ctx[lookup]);
};

function HandlebarsCompiler() {
    HandlebarsParserListener.call(this);
    this._inputVar = "__$ctx";
    this._outputVar = "__$result";
    this._helpers = { expr: {}, block: {} };
    this._usedExprHelpers = [];

    this._helpers.block["each"] = foreachFunction;
    this._helpers.block["if"] = ifFunction;
    this._helpers.block["with"] = withFunction;

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
        this._bodyStack[this._bodyStack.length -1] = funcSignatureAndBody + this._bodyStack[this._bodyStack.length -1];
    }
};

HandlebarsCompiler.prototype.addBlocks = function(){
    for(var block in this._helpers.block) {
        this._bodyStack[this._bodyStack.length -1] = `var ${this.mangleEscape(block)} = ${this._helpers.block[block].toString()}\n${this._bodyStack[this._bodyStack.length -1]}`;
    }
};

HandlebarsCompiler.prototype.compile = function (template) {
    this._bodyStack = [];
    this.pushScope();

    var chars = new antlr4.InputStream(template);
    var lexer = new HandlebarsLexer(chars);
    var tokens = new antlr4.CommonTokenStream(lexer);
    var parser = new HandlebarsParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.document();

    antlr4.tree.ParseTreeWalker.DEFAULT.walk(this, tree);

    this.addHelpers();
    this.addBlocks();

    return new Function(this._inputVar, this.popScope());
};

HandlebarsCompiler.prototype.pushScope = function (expr) {
    this._bodyStack.push("");
    this._bodyStack[this._bodyStack.length -1] = `var ${this._outputVar} = "";\n`;
};

HandlebarsCompiler.prototype.popScope = function (expr) {
    this._bodyStack[this._bodyStack.length -1] += `return ${this._outputVar};\n`;
    return this._bodyStack.pop();
};

HandlebarsCompiler.prototype.append = function (expr) {
    this._bodyStack[this._bodyStack.length -1] += `${this._outputVar} += ${expr};\n`
};

HandlebarsCompiler.prototype.exitRawElement = function (ctx) {
    // Simply grab all the text and output it
    var text = ctx.getText();
    var escapedText = HandlebarsCompiler.escape(text);
    this.append(`"${escapedText}"`);
};

HandlebarsCompiler.prototype.exitDocument = function (ctx) {
    // Simply grab all the text and log it - for debugging purposes only
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

HandlebarsCompiler.prototype.exitBlockElement = function (ctx){
    if (!(ctx.start.identifier.text == ctx.end.identifier.text)) {
        throw `Block start '${ctx.start.identifier.text}' does not match the block end '${ctx.end.identifier.text}'.`;
    }

    var functionCall = `${this.mangleEscape(ctx.start.identifier.text)}(${this._inputVar},${ctx.body.source}`;
    for (var i = 0; i < ctx.start.args.length; i++) {
        functionCall += `,${ctx.start.args[i].source}`;
    }
    functionCall += ')';
    this.append(functionCall);
};

HandlebarsCompiler.prototype.enterBlockBody = function (ctx) {
    this.pushScope();
};

HandlebarsCompiler.prototype.exitBlockBody = function (ctx) {
    var accumulatedbody = this.popScope();
    ctx.source = (new Function(this._inputVar, accumulatedbody)).toString();
};

HandlebarsCompiler.prototype.exitSubExpression = function (ctx) {
    ctx.source = ctx.children[0].source;
};

exports.HandlebarsCompiler = HandlebarsCompiler;
