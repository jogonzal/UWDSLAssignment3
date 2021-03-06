parser grammar HandlebarsParser;

options { language=JavaScript; tokenVocab=HandlebarsLexer; }

document : element* EOF ;

element
    : rawElement
    | expressionElement
    | blockElement
    | commentElement
    ;

rawElement
    : TEXT
    | BRACE TEXT;

literal returns [source]
    : INTEGER
    | FLOAT
    | STRING
    ;

dataLookup returns [source]
    : variableName=ID
    ;

expressionElement
    : START exp=expression END
    ;

expression returns [source]
    : helperApplication
    | subExpression
    ;

subExpression returns [source]
    : parenthesizedExpression
    | literal
    | dataLookup
    ;

// Functions that are called within context
helperApplication returns [source]
    : funcName=ID (args+=subExpression)+
    ;

parenthesizedExpression returns [source]
    : OPEN_PAREN exp=expression CLOSE_PAREN;

// Blocks like #each and #with
blockElement returns [source]
    : start=blockStart body=blockBody end=blockEnd;

blockStart returns [source]
    : START BLOCK identifier=ID (args+=subExpression)+ END;

blockBody returns [source]
    : element*
    ;

blockEnd returns [source]
    : START CLOSE_BLOCK identifier=ID END;

// Simply passed down
commentElement
    : START COMMENT END_COMMENT ;
