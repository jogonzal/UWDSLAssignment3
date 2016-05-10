mocha.setup("bdd");
var expect = chai.expect;

var Compiler = require('compiler').HandlebarsCompiler;

describe("Parsing", function () {
    it("Parse raw text", function () {
        var template = `<html><body>Hello world</body></html>`;
        var data = {};
        var compiler = new Compiler();
        var f = compiler.compile(template);
        var render = f(data);
        expect(render).to.equal(template);
    });

    it("Parse text with comments", function () {
        var template = `<html><body>Hello world {{!-- this is a comment --}} and hello again</body></html>`;
        var data = {};
        var compiler = new Compiler();
        var f = compiler.compile(template);
        var render = f(data);
        var expected = `<html><body>Hello world  and hello again</body></html>`;
        expect(render).to.equal(expected);
    });

    it("Parse templates with complex lexing", function () {
        var template = `
<h1 onclick="(function() { alert('{'); })()">
    
</h1>`;
        var compiler = new Compiler();
        var data = {};
        var f = compiler.compile(template);
        var render = f(data);
        var expected = `
<h1 onclick="(function() { alert('{'); })()">
    
</h1>`;
        expect(render).to.equal(expected);
    });
});

describe("Expressions", function () {
    it("Parse expressions with data references", function () {
        var template = `
<html>
    <head>
        <title>{{ title }}</title>
    </head>
    <body>
    <h1>
        {{ title }}
    </h1>
    <a href="{{ uri }}">Visit</a>
    </body>
</html>`;
        var compiler = new Compiler();
        var data = {
            title: "CSEP 590C: Domain-Specific Languages",
            uri: "https://www.cs.washington.edu/education/courses/csep590c/16sp"
        };
        var f = compiler.compile(template);
        var render = f(data);
        var expected = `
<html>
    <head>
        <title>CSEP 590C: Domain-Specific Languages</title>
    </head>
    <body>
    <h1>
        CSEP 590C: Domain-Specific Languages
    </h1>
    <a href="https://www.cs.washington.edu/education/courses/csep590c/16sp">Visit</a>
    </body>
</html>`;
        expect(render).to.equal(expected);
    });

    it("Parse expressions with expr helpers", function () {
        var template = `
<html>
    <head>
        <title>{{ title }}</title>
    </head>
    <body>
    <h1>
        {{ title }}
    </h1>
    <a href="{{ createURI 'csep590c' 2016 'Spring' }}">Visit</a>
    </body>
</html>`;
        var compiler = new Compiler();
        var data = {
            title: "CSEP 590C: Domain-Specific Languages",
            uri: "https://www.cs.washington.edu/education/courses/csep590c/16sp"
        };
        compiler.registerExprHelper('createURI', function (ctx, course, year, quarter) {
            var quarterId = quarter.slice(0, 2).toLowerCase();
            return `https://www.cs.washington.edu/education/courses/${course}/${year % 100}${quarterId}`;
        });
        var f = compiler.compile(template);
        var render = f(data);
        var expected = `
<html>
    <head>
        <title>CSEP 590C: Domain-Specific Languages</title>
    </head>
    <body>
    <h1>
        CSEP 590C: Domain-Specific Languages
    </h1>
    <a href="https://www.cs.washington.edu/education/courses/csep590c/16sp">Visit</a>
    </body>
</html>`;
        expect(render).to.equal(expected);
    });

    it("Parse expressions with expr helpers that reference data", function () {
        var template = `
<html>
    <head>
        <title>{{ title }}</title>
    </head>
    <body>
    <h1>
        {{ title }}
    </h1>
    <a href="{{ createURI 'csep590c' 2016 'Spring' }}">Visit</a>
    </body>
</html>`;
        var compiler = new Compiler();
        var data = {
            title: "CSEP 590C: Domain-Specific Languages",
            domain: "www.cs.washington.edu/education/courses"
        };
        compiler.registerExprHelper('createURI', function (ctx, course, year, quarter) {
            var quarterId = quarter.slice(0, 2).toLowerCase();
            return `https://${ctx.domain}/${course}/${year % 100}${quarterId}`;
        });
        var f = compiler.compile(template);
        var render = f(data);
        var expected = `
<html>
    <head>
        <title>CSEP 590C: Domain-Specific Languages</title>
    </head>
    <body>
    <h1>
        CSEP 590C: Domain-Specific Languages
    </h1>
    <a href="https://www.cs.washington.edu/education/courses/csep590c/16sp">Visit</a>
    </body>
</html>`;
        expect(render).to.equal(expected);
    });

    it("Parse expressions with nested subexpressions", function () {
        var template = `
<html>
    <head>
        <title>{{ title }}</title>
    </head>
    <body>
    <h1>
        {{ title }}
    </h1>
    <a href="{{ createURI (concat 'csep' 590 'c') 2016 'Spring' }}">Visit</a>
    </body>
</html>`;
        var compiler = new Compiler();
        var data = {
            title: "CSEP 590C: Domain-Specific Languages",
            domain: "www.cs.washington.edu/education/courses"
        };
        compiler.registerExprHelper('createURI', function (ctx, course, year, quarter) {
            var quarterId = quarter.slice(0, 2).toLowerCase();
            return `https://${ctx.domain}/${course}/${year % 100}${quarterId}`;
        });
        compiler.registerExprHelper('concat', function (ctx, ...params) {
            return params.join('');
        });
        var f = compiler.compile(template);
        var render = f(data);
        var expected = `
<html>
    <head>
        <title>CSEP 590C: Domain-Specific Languages</title>
    </head>
    <body>
    <h1>
        CSEP 590C: Domain-Specific Languages
    </h1>
    <a href="https://www.cs.washington.edu/education/courses/csep590c/16sp">Visit</a>
    </body>
</html>`;
        expect(render).to.equal(expected);
    });
});

describe("Blocks", function () {
    it("Fail on non-matching blocks", function () {
        var template = "<html>{{#block 1 2 3}} Text {{/wrong}}</html>";
        var compiler = new Compiler();
        expect(() => compiler.compile(template)).to.throw("Block start 'block' does not match the block end 'wrong'.");
    });

    it("Pass through an ID block", function () {
        var template = "<html><body><h1>{{#id}}{{title}}{{/id}}</h1></body></html>";
        var compiler = new Compiler();
        compiler.registerBlockHelper('id', function (ctx, body) {
            return body(ctx);
        });
        var f = compiler.compile(template);
        var data = {title: "Domain-Specific Languages"};
        var render = f(data);
        expect(render).to.equal("<html><body><h1>Domain-Specific Languages</h1></body></html>");
    });

    it("'each' block iterates", function () {
        var template = `
<html><body>
<ul>{{#each episodes}}
    <li>{{title}}</li>
{{/each}}</ul>
</body></html>`;
        var compiler = new Compiler();
        var f = compiler.compile(template);
        var data = {
            episodes: [
                {title: "The Phantom Menace"},
                {title: "Attack of the Clones"},
                {title: "Revenge of the Sith"},
                {title: "A New Hope"},
                {title: "The Empire Strikes Back"},
                {title: "Return of the Jedi"},
                {title: "The Force Awakens"}
            ]
        };
        var render = f(data);
        var expected = `
<html><body>
<ul>
    <li>The Phantom Menace</li>

    <li>Attack of the Clones</li>

    <li>Revenge of the Sith</li>

    <li>A New Hope</li>

    <li>The Empire Strikes Back</li>

    <li>Return of the Jedi</li>

    <li>The Force Awakens</li>
</ul>
</body></html>`;
        expect(render).to.equal(expected);
    });

    it("'if' block is conditional", function () {
        var template = `
<html><body>
<ul>{{#each episodes}}
    <li>
        <h1>{{title}}</h1>
        {{#if starring_luke}}
            <span class="note">Note: features Luke!</span>
        {{/if}}
    </li>
{{/each}}</ul>
</body></html>`;
        var compiler = new Compiler();
        var f = compiler.compile(template);
        var data = {
            episodes: [
                {title: "The Phantom Menace"},
                {title: "Attack of the Clones"},
                {title: "Revenge of the Sith", starring_luke: true},
                {title: "A New Hope", starring_luke: true},
                {title: "The Empire Strikes Back", starring_luke: true},
                {title: "Return of the Jedi", starring_luke: true},
                {title: "The Force Awakens", starring_luke: true}
            ]
        };
        var render = f(data);
        var expected = `
<html><body>
<ul>
    <li>
        <h1>The Phantom Menace</h1>
        
    </li>

    <li>
        <h1>Attack of the Clones</h1>
        
    </li>

    <li>
        <h1>Revenge of the Sith</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>A New Hope</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>The Empire Strikes Back</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>Return of the Jedi</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>The Force Awakens</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>
</ul>
</body></html>`;
        expect(render).to.equal(expected);
    });

    it("'if' block with parameters", function () {
        var template = `
<html><body>
<ul>{{#each episodes}}
    <li>
        <h1>{{title}}</h1>
        {{#if (contains jedi 'Luke')}}
            <span class="note">Note: features Luke!</span>
        {{/if}}
    </li>
{{/each}}</ul>
</body></html>`;
        var compiler = new Compiler();
        compiler.registerExprHelper('contains', function (ctx, list, item) {
            return list.indexOf(item) >= 0;
        });
        var f = compiler.compile(template);
        var data = {
            episodes: [
                {title: "The Phantom Menace", jedi: ['Anakin', 'Qui-Gon', 'Obi-Wan', 'Yoda', 'Mace']},
                {title: "Attack of the Clones", jedi: ['Anakin', 'Obi-Wan', 'Yoda', 'Mace']},
                {title: "Revenge of the Sith", jedi: ['Obi-Wan', 'Yoda', 'Mace', 'Luke']},
                {title: "A New Hope", jedi: ['Obi-Wan', 'Luke']},
                {title: "The Empire Strikes Back", jedi: ['Obi-Wan', 'Luke', 'Yoda']},
                {title: "Return of the Jedi", jedi: ['Anakin', 'Luke', 'Yoda']},
                {title: "The Force Awakens", jedi: ['Luke', 'Rey']}
            ]
        };
        var render = f(data);
        var expected = `
<html><body>
<ul>
    <li>
        <h1>The Phantom Menace</h1>
        
    </li>

    <li>
        <h1>Attack of the Clones</h1>
        
    </li>

    <li>
        <h1>Revenge of the Sith</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>A New Hope</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>The Empire Strikes Back</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>Return of the Jedi</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>The Force Awakens</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>
</ul>
</body></html>`;
        expect(render).to.equal(expected);
    });

    it("'if' block inside enumeration", function () {
        var template = `
<html><body>
<ul>{{#each episodes}}
    <li>
        <h1>{{title}}</h1>
        {{#each jedi}}{{#if (eq 'Luke')}}
            <span class="note">Note: features Luke!</span>
        {{/if}}{{/each}}
    </li>
{{/each}}</ul>
</body></html>`;
        var compiler = new Compiler();
        compiler.registerExprHelper('eq', function (ctx, value) {
            return ctx == value;
        });
        var f = compiler.compile(template);
        var data = {
            episodes: [
                {title: "The Phantom Menace", jedi: ['Anakin', 'Qui-Gon', 'Obi-Wan', 'Yoda', 'Mace']},
                {title: "Attack of the Clones", jedi: ['Anakin', 'Obi-Wan', 'Yoda', 'Mace']},
                {title: "Revenge of the Sith", jedi: ['Obi-Wan', 'Yoda', 'Mace', 'Luke']},
                {title: "A New Hope", jedi: ['Obi-Wan', 'Luke']},
                {title: "The Empire Strikes Back", jedi: ['Obi-Wan', 'Luke', 'Yoda']},
                {title: "Return of the Jedi", jedi: ['Anakin', 'Luke', 'Yoda']},
                {title: "The Force Awakens", jedi: ['Luke', 'Rey']}
            ]
        };
        var render = f(data);
        var expected = `
<html><body>
<ul>
    <li>
        <h1>The Phantom Menace</h1>
        
    </li>

    <li>
        <h1>Attack of the Clones</h1>
        
    </li>

    <li>
        <h1>Revenge of the Sith</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>A New Hope</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>The Empire Strikes Back</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>Return of the Jedi</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>The Force Awakens</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>
</ul>
</body></html>`;
        expect(render).to.equal(expected);
    });

    it("'with' block", function () {
        var template = `
<html><body>
<ul>{{#each episodes}}
    <li>
        <h1>{{title}}</h1>
        {{#with (concat 'ro' 'les')}}{{#each jedi}}{{#if (eq 'Luke')}}
            <span class="note">Note: features Luke!</span>
        {{/if}}{{/each}}{{/with}}
    </li>
{{/each}}</ul>
</body></html>`;
        var compiler = new Compiler();
        compiler.registerExprHelper('eq', function (ctx, value) {
            return ctx == value;
        });
        compiler.registerExprHelper('concat', function (ctx, ...params) {
            return params.join('');
        });
        var f = compiler.compile(template);
        var data = {
            episodes: [
                {title: "The Phantom Menace", roles: {jedi: ['Anakin', 'Qui-Gon', 'Obi-Wan', 'Yoda', 'Mace']}},
                {title: "Attack of the Clones", roles: {jedi: ['Anakin', 'Obi-Wan', 'Yoda', 'Mace']}},
                {title: "Revenge of the Sith", roles: {jedi: ['Obi-Wan', 'Yoda', 'Mace', 'Luke']}},
                {title: "A New Hope", roles: {jedi: ['Obi-Wan', 'Luke']}},
                {title: "The Empire Strikes Back", roles: {jedi: ['Obi-Wan', 'Luke', 'Yoda']}},
                {title: "Return of the Jedi", roles: {jedi: ['Anakin', 'Luke', 'Yoda']}},
                {title: "The Force Awakens", roles: {jedi: ['Luke', 'Rey']}}
            ]
        };
        var render = f(data);
        var expected = `
<html><body>
<ul>
    <li>
        <h1>The Phantom Menace</h1>
        
    </li>

    <li>
        <h1>Attack of the Clones</h1>
        
    </li>

    <li>
        <h1>Revenge of the Sith</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>A New Hope</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>The Empire Strikes Back</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>Return of the Jedi</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>

    <li>
        <h1>The Force Awakens</h1>
        
            <span class="note">Note: features Luke!</span>
        
    </li>
</ul>
</body></html>`;
        expect(render).to.equal(expected);
    });
});
