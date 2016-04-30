var antlr4 = require('antlr4/index');
var RegexListener = require('RegexListener').RegexListener;

function RegexExplainer() {
    RegexListener.call(this);
    this._idGenerator = 0;
    this._captureNumber = 1;
    this.visibleStack = [];
    this.data = [];
    return this;
}

RegexExplainer.prototype = Object.create(RegexListener.prototype);
RegexExplainer.prototype.constructor = RegexExplainer;
exports.RegexExplainer = RegexExplainer;

RegexExplainer.prototype._generateId = function () {
    return "n" + this._idGenerator++;
};

RegexExplainer.prototype.enterEveryRule = function (ctx) {
    ctx._id = this._generateId();
};

RegexExplainer.prototype.exitEveryRule = function (ctx) {
    var lastVisible = this.visibleStack.slice(-1)[0];
    if (lastVisible && lastVisible === ctx) {
        this.visibleStack.pop();
    }
};

RegexExplainer.prototype.appendNode = function (ctx, text) {
    var lastVisible = this.visibleStack.slice(-1)[0];
    var parent = lastVisible ? lastVisible._id : "#";
    this.data.push({
        "id": ctx._id,
        "parent": parent,
        "text": text,
        "state": {"opened": true},
        "icon": "glyphicon glyphicon-asterisk"
    });
    this.visibleStack.push(ctx);
};

RegexExplainer.prototype.enterRegex = function (ctx) {
    if (ctx.args.length <= 1) return;
    this.appendNode(ctx, "Match any of the following alternatives, in order:");
};

RegexExplainer.prototype.enterConcat = function (ctx) {
    this.appendNode(ctx, "Match this regex:");
};

RegexExplainer.prototype.enterStar = function (ctx) {
    this.appendNode(ctx, "Match the regex below between 0 and unlimited times (greedily):");
};

RegexExplainer.prototype.enterPlus = function (ctx) {
    this.appendNode(ctx, "Match the regex below between 1 and unlimited times (greedily):");
};

RegexExplainer.prototype.enterOptional = function (ctx) {
    this.appendNode(ctx, "Match the regex below between 0 and 1 times (greedily):");
};

RegexExplainer.prototype.enterAnyRegex = function (ctx) {
    this.appendNode(ctx, "Any character");
};

RegexExplainer.prototype.enterStartRegex = function (ctx) {
    this.appendNode(ctx, "Start of the line");
};

RegexExplainer.prototype.enterEndRegex = function (ctx) {
    this.appendNode(ctx, "End of the line");
};

RegexExplainer.prototype.enterStringRegex = function (ctx) {
    this.appendNode(ctx, "String \"" + ctx.getText() + "\", literally");
};

RegexExplainer.prototype.enterGroup = function (ctx) {
    if (ctx.nocapture) {
        this.appendNode(ctx, "Match the regex below as a non-capturing group:");
    }
    else {
        this.appendNode(ctx,
            "Match the regex below and capture its match into backreference number " +
            this._captureNumber++);
    }
};

